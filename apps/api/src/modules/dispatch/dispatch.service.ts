import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  AssignmentStatus,
  BookingStatus,
  EngineerApprovalStatus,
  EngineerAvailability,
  JobEventType,
  type EngineerProfile,
} from '@prisma/client';
import { Queue } from 'bullmq';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import { GeoService } from '../../redis/geo.service';
import { OtpService } from '../otp/otp.service';
import { DispatchGateway } from './dispatch.gateway';
import {
  BASE_RADIUS_KM,
  DISPATCH_QUEUE,
  ENGINEER_CAPACITY,
  MAX_RADIUS_KM,
  OFFER_COUNTDOWN_SEC,
  RADIUS_STEP_KM,
  TIER_PRIORITY,
  etaMinutes,
  scoreCandidate,
} from './dispatch.constants';

export interface RankedCandidate {
  engineer: EngineerProfile;
  distanceM: number;
  score: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  // Per-booking current search radius. In-process (same worker runs the
  // BullMQ timeout); a multi-instance deployment would move this to Redis.
  private readonly radius = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly otp: OtpService,
    private readonly crypto: CryptoService,
    @InjectQueue(DISPATCH_QUEUE) private readonly queue: Queue,
    @Inject(forwardRef(() => DispatchGateway))
    private readonly gateway: DispatchGateway,
  ) {}

  // ── Entry: begin auto-dispatch for a booking ──────────────────────────────
  async startDispatch(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.confirmed) {
      throw new BadRequestException(
        `Booking must be 'confirmed' to dispatch (is '${booking.status}')`,
      );
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.dispatching,
        events: { create: { type: JobEventType.dispatching } },
      },
    });
    this.radius.set(bookingId, BASE_RADIUS_KM);
    await this.offerNext(bookingId);
  }

  // ── Offer the job to the next-best engineer (widen / escalate as needed) ──
  async offerNext(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, address: true },
    });
    if (!booking || booking.status !== BookingStatus.dispatching) return;
    if (!booking.address) {
      this.logger.warn(`Booking ${bookingId} has no address — escalating`);
      return this.escalate(bookingId);
    }

    const tried = await this.triedEngineerIds(bookingId);
    let radiusKm = this.radius.get(bookingId) ?? BASE_RADIUS_KM;

    while (radiusKm <= MAX_RADIUS_KM) {
      const candidates = await this.findRankedCandidates(
        booking.address.lng,
        booking.address.lat,
        radiusKm,
        booking.service?.requiredSkills ?? [],
        tried,
      );
      if (candidates.length > 0) {
        this.radius.set(bookingId, radiusKm);
        return this.offerTo(booking, candidates[0]);
      }
      radiusKm += RADIUS_STEP_KM; // widen and retry (§7)
    }

    // Exhausted max radius with no taker → admin manual assignment (§7).
    this.radius.set(bookingId, MAX_RADIUS_KM);
    await this.escalate(bookingId);
  }

  private async offerTo(
    booking: { id: string; total: unknown; service: { name: string } | null; address: { line1: string; city: string } | null },
    candidate: RankedCandidate,
  ): Promise<void> {
    const assignment = await this.prisma.assignment.create({
      data: {
        bookingId: booking.id,
        engineerId: candidate.engineer.id,
        status: AssignmentStatus.offered,
        distanceM: candidate.distanceM,
        score: candidate.score,
      },
    });

    const payload = {
      assignmentId: assignment.id,
      bookingId: booking.id,
      amount: Number(booking.total),
      service: booking.service?.name ?? 'Custom request',
      address: booking.address
        ? `${this.crypto.decryptMaybe(booking.address.line1)}, ${booking.address.city}`
        : undefined,
      distanceM: candidate.distanceM,
      etaMin: etaMinutes(candidate.distanceM),
      countdownSec: OFFER_COUNTDOWN_SEC,
    };
    this.gateway.offerToEngineer(candidate.engineer.id, payload);
    this.logger.log(
      `Offered booking ${booking.id} → engineer ${candidate.engineer.id} (${candidate.distanceM}m)`,
    );

    // Arm the countdown: if not accepted in time, move on (§7 BullMQ timeout).
    try {
      await this.queue.add(
        'offer-timeout',
        { assignmentId: assignment.id, bookingId: booking.id },
        {
          delay: OFFER_COUNTDOWN_SEC * 1000,
          jobId: `timeout_${assignment.id}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Could not arm offer timeout (Redis?): ${(err as Error).message}`,
      );
    }
  }

  // ── Engineer responds to an offer (over WebSocket) ────────────────────────
  async respondToOffer(userId: string, assignmentId: string, accept: boolean) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.engineerId !== engineer.id) {
      throw new ForbiddenException('This offer is not yours');
    }
    if (assignment.status !== AssignmentStatus.offered) {
      throw new BadRequestException('Offer is no longer open');
    }

    await this.clearTimeout(assignmentId);

    if (!accept) {
      await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.declined, respondedAt: new Date() },
      });
      await this.offerNext(assignment.bookingId);
      return { accepted: false };
    }

    // Accept: bind the engineer to the job and take it out of the pool.
    await this.prisma.$transaction([
      this.prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.accepted, respondedAt: new Date() },
      }),
      this.prisma.booking.update({
        where: { id: assignment.bookingId },
        data: {
          engineerId: engineer.id,
          status: BookingStatus.assigned,
          events: {
            create: {
              type: JobEventType.assigned,
              metadata: { engineerId: engineer.id },
            },
          },
        },
      }),
      this.prisma.engineerProfile.update({
        where: { id: engineer.id },
        data: { currentLoad: { increment: 1 } },
      }),
    ]);
    this.radius.delete(assignment.bookingId);
    // Generate the start OTP now so the customer sees it in live tracking (§8.1).
    await this.otp.ensureStartOtp(assignment.bookingId);
    this.logger.log(`Engineer ${engineer.id} accepted booking ${assignment.bookingId}`);
    return { accepted: true, bookingId: assignment.bookingId };
  }

  /** Called by the BullMQ processor when an offer times out. */
  async handleOfferTimeout(assignmentId: string, bookingId: string): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.status !== AssignmentStatus.offered) return;
    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.timed_out, respondedAt: new Date() },
    });
    this.gateway.cancelOffer(assignment.engineerId, assignmentId);
    this.logger.log(`Offer ${assignmentId} timed out → next engineer`);
    await this.offerNext(bookingId);
  }

  // ── Admin live dispatch (Component Brief: Live dispatch) ───────────────────
  unassignedQueue() {
    return this.prisma.booking.findMany({
      where: { status: BookingStatus.dispatching, engineerId: null },
      include: {
        service: true,
        address: true,
        customer: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async bestMatches(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, address: true },
    });
    if (!booking?.address) throw new BadRequestException('Booking has no address');
    const tried = await this.triedEngineerIds(bookingId);
    const candidates = await this.findRankedCandidates(
      booking.address.lng,
      booking.address.lat,
      MAX_RADIUS_KM,
      booking.service?.requiredSkills ?? [],
      tried,
    );
    return candidates.map((c) => ({
      engineerId: c.engineer.id,
      fullName: c.engineer.fullName,
      rating: c.engineer.rating,
      skills: c.engineer.skills,
      currentLoad: c.engineer.currentLoad,
      distanceM: c.distanceM,
      etaMin: etaMinutes(c.distanceM),
      score: Math.round(c.score * 100) / 100,
    }));
  }

  /** Auto-assign best: offer the top-scored engineer (§ admin auto-assign). */
  async autoAssignBest(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.confirmed) {
      return this.startDispatch(bookingId);
    }
    if (booking.status === BookingStatus.dispatching) {
      return this.offerNext(bookingId);
    }
    throw new BadRequestException(`Cannot dispatch a '${booking.status}' booking`);
  }

  /** Assign manually: bind a specific engineer directly (admin override). */
  async assignManually(adminUserId: string, bookingId: string, engineerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const assignable: BookingStatus[] = [
      BookingStatus.confirmed,
      BookingStatus.dispatching,
    ];
    if (!assignable.includes(booking.status)) {
      throw new BadRequestException(`Cannot assign a '${booking.status}' booking`);
    }
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
    });
    if (!engineer) throw new NotFoundException('Engineer not found');
    if (engineer.approvalStatus !== EngineerApprovalStatus.approved) {
      throw new BadRequestException('Engineer is not approved');
    }

    await this.prisma.$transaction([
      this.prisma.assignment.create({
        data: {
          bookingId,
          engineerId,
          status: AssignmentStatus.accepted,
          respondedAt: new Date(),
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          engineerId,
          status: BookingStatus.assigned,
          events: {
            create: {
              type: JobEventType.assigned,
              metadata: { manual: true, by: adminUserId, engineerId },
            },
          },
        },
      }),
      this.prisma.engineerProfile.update({
        where: { id: engineerId },
        data: { currentLoad: { increment: 1 } },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'dispatch.assign_manual',
          entityType: 'booking',
          entityId: bookingId,
          metadata: { engineerId },
        },
      }),
    ]);
    this.radius.delete(bookingId);
    await this.otp.ensureStartOtp(bookingId);
    this.gateway.notifyAssigned(engineerId, bookingId);
    return { assigned: true, engineerId };
  }

  // ── Internals ──────────────────────────────────────────────────────────────
  private async escalate(bookingId: string): Promise<void> {
    // Leave the booking in 'dispatching' with no engineer; it surfaces in the
    // admin unassigned queue for manual assignment (§7 fallback).
    await this.prisma.jobEvent.create({
      data: {
        bookingId,
        type: JobEventType.dispatching,
        metadata: { escalated: true, reason: 'no_engineer_in_range' },
      },
    });
    this.logger.warn(`Booking ${bookingId} escalated to admin manual assignment`);
  }

  private async triedEngineerIds(bookingId: string): Promise<Set<string>> {
    const rows = await this.prisma.assignment.findMany({
      where: { bookingId },
      select: { engineerId: true },
    });
    return new Set(rows.map((r) => r.engineerId));
  }

  private async findRankedCandidates(
    lng: number,
    lat: number,
    radiusKm: number,
    requiredSkills: string[],
    exclude: Set<string>,
  ): Promise<RankedCandidate[]> {
    const hits = await this.geo.searchNearby(lng, lat, radiusKm);
    if (hits.length === 0) return [];
    const distanceById = new Map(hits.map((h) => [h.engineerId, h.distanceM]));

    const engineers = await this.prisma.engineerProfile.findMany({
      where: {
        id: { in: hits.map((h) => h.engineerId) },
        availability: EngineerAvailability.online,
        approvalStatus: EngineerApprovalStatus.approved,
        currentLoad: { lt: ENGINEER_CAPACITY }, // "free"
      },
    });

    return engineers
      .filter((e) => !exclude.has(e.id))
      .filter((e) => requiredSkills.every((s) => e.skills.includes(s)))
      .map((engineer) => {
        const distanceM = distanceById.get(engineer.id) ?? Number.MAX_SAFE_INTEGER;
        const score = scoreCandidate(
          distanceM,
          engineer.currentLoad,
          engineer.rating,
          TIER_PRIORITY[engineer.tier] ?? 0,
        );
        return { engineer, distanceM, score };
      })
      .sort((a, b) => a.score - b.score);
  }

  private async clearTimeout(assignmentId: string): Promise<void> {
    try {
      await this.queue.remove(`timeout_${assignmentId}`);
    } catch {
      // job already gone / Redis down — nothing to clear
    }
  }
}
