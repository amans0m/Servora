import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, JobEventType } from '@prisma/client';

import { NotificationChannel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { IncentivesService } from '../incentives/incentives.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpService } from '../otp/otp.service';
import { PaymentsService } from '../payments/payments.service';
import { PayoutsService } from '../payouts/payouts.service';

/**
 * Job completion lifecycle (§6, §8.1):
 *   assigned → (start OTP) in_progress → proof → complete-work → awaiting_payment
 *   → customer pays (capture) → completion OTP revealed → engineer closes → payout.
 */
@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly payments: PaymentsService,
    private readonly payouts: PayoutsService,
    private readonly storage: StorageService,
    private readonly incentives: IncentivesService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Customer: read the start OTP (reads it out to the engineer) ───────────
  async getStartOtp(userId: string, bookingId: string) {
    await this.requireCustomerBooking(userId, bookingId);
    const code = await this.otp.revealStartCode(bookingId);
    return { code };
  }

  // ── Engineer: confirm arrival with the start OTP → begin work ─────────────
  async startJob(userId: string, bookingId: string, code: string) {
    const { booking } = await this.requireEngineerBooking(userId, bookingId);
    const startable: BookingStatus[] = [
      BookingStatus.assigned,
      BookingStatus.en_route,
    ];
    if (!startable.includes(booking.status)) {
      throw new BadRequestException(`Cannot start a '${booking.status}' job`);
    }
    const ok = await this.otp.verifyStart(bookingId, code);
    if (!ok) throw new BadRequestException('Incorrect start OTP');

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.in_progress,
        events: {
          create: [{ type: JobEventType.arrived }, { type: JobEventType.started }],
        },
      },
    });
    return { started: true };
  }

  // ── Engineer: proof of work ───────────────────────────────────────────────
  async proofUploadUrl(
    userId: string,
    bookingId: string,
    fileName: string,
    contentType: string,
    sizeBytes?: number,
  ) {
    await this.requireEngineerBooking(userId, bookingId);
    return this.storage.createUploadUrl(
      `proofs/${bookingId}`,
      fileName,
      contentType,
      sizeBytes,
    );
  }

  async attachProof(userId: string, bookingId: string, key: string) {
    const { booking } = await this.requireEngineerBooking(userId, bookingId);
    if (booking.status !== BookingStatus.in_progress) {
      throw new BadRequestException('Add proof while the job is in progress');
    }
    // The key must belong to THIS booking's proof namespace (anti-SSRF, §A5).
    this.storage.assertKeyInPrefix(key, `proofs/${bookingId}`);
    await this.prisma.jobEvent.create({
      data: { bookingId, type: JobEventType.proof_uploaded, metadata: { key } },
    });
    return { attached: true };
  }

  // ── Engineer: mark work done → customer must now pay ──────────────────────
  async completeWork(userId: string, bookingId: string) {
    const { booking } = await this.requireEngineerBooking(userId, bookingId);
    if (booking.status !== BookingStatus.in_progress) {
      throw new BadRequestException(`Cannot complete a '${booking.status}' job`);
    }
    const proofCount = await this.prisma.jobEvent.count({
      where: { bookingId, type: JobEventType.proof_uploaded },
    });
    if (proofCount === 0) {
      throw new BadRequestException('Upload at least one proof photo before completing');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.awaiting_payment,
        events: { create: { type: JobEventType.completion_requested } },
      },
    });
    return { awaitingPayment: true };
  }

  // ── Customer: pay → capture → completion OTP revealed (§6) ─────────────────
  async payAndComplete(
    userId: string,
    bookingId: string,
    method: string,
    razorpayPaymentId?: string,
  ) {
    const booking = await this.requireCustomerBooking(userId, bookingId);
    if (booking.status !== BookingStatus.awaiting_payment) {
      throw new BadRequestException(
        `Booking is '${booking.status}', not awaiting payment`,
      );
    }
    await this.payments.capture(bookingId, method, razorpayPaymentId);
    // OTP exists only because capture succeeded — reveal it to the customer.
    const completionOtp = await this.otp.revealCompletionCode(bookingId);
    await this.notifications.notify(userId, 'completion_otp_ready', { bookingId }, [
      NotificationChannel.push,
    ]);
    return { paid: true, completionOtp };
  }

  async getCompletionOtp(userId: string, bookingId: string) {
    await this.requireCustomerBooking(userId, bookingId);
    const code = await this.otp.revealCompletionCode(bookingId);
    // Locked until payment is captured (§6).
    return { locked: code === null, code };
  }

  // ── Engineer: close the job with the completion OTP → payout ──────────────
  async closeJob(userId: string, bookingId: string, code: string) {
    const { booking, engineerId } = await this.requireEngineerBooking(userId, bookingId);
    if (booking.status !== BookingStatus.awaiting_payment) {
      throw new BadRequestException(
        `Cannot close a '${booking.status}' job (customer must pay first)`,
      );
    }
    const ok = await this.otp.verifyCompletion(bookingId, code);
    if (!ok) throw new BadRequestException('Incorrect completion OTP');

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.completed,
          events: { create: { type: JobEventType.completed } },
        },
      }),
      this.prisma.engineerProfile.update({
        where: { id: engineerId },
        data: {
          currentLoad: { decrement: 1 },
          jobsCompleted: { increment: 1 },
        },
      }),
    ]);

    // Release the engineer payout via RazorpayX (minus tier commission).
    const payout = await this.payouts.queuePayout(bookingId);
    // Update tier progression + award any satisfied quests (§8.4).
    await this.incentives.evaluateOnCompletion(engineerId);
    this.logger.log(`Booking ${bookingId} closed → payout ${payout.id} queued`);
    return { closed: true, payout: { id: payout.id, netAmount: payout.netAmount } };
  }

  // ── Auth helpers ───────────────────────────────────────────────────────────
  private async requireCustomerBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customer.userId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    return booking;
  }

  private async requireEngineerBooking(userId: string, bookingId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.engineerId !== engineer.id) {
      throw new ForbiddenException('You are not assigned to this job');
    }
    return { booking, engineerId: engineer.id };
  }
}
