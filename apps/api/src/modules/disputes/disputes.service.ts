import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  JobEventType,
  Role,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { RaiseDisputeDto, ResolveDisputeDto } from './dto/disputes.dto';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer or engineer raises a dispute on a booking they're party to. */
  async raise(userId: string, role: Role, dto: RaiseDisputeDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        customer: { select: { userId: true } },
        engineer: { select: { userId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const isParty =
      (role === Role.customer && booking.customer.userId === userId) ||
      (role === Role.engineer && booking.engineer?.userId === userId);
    if (!isParty) throw new ForbiddenException('You are not party to this booking');

    const dispute = await this.prisma.dispute.create({
      data: {
        bookingId: dto.bookingId,
        raisedById: userId,
        category: dto.category,
        severity: dto.severity ?? undefined,
        description: dto.description,
      },
    });
    await this.prisma.jobEvent.create({
      data: { bookingId: dto.bookingId, type: JobEventType.disputed, metadata: { disputeId: dispute.id } },
    });
    return dispute;
  }

  listMine(userId: string) {
    return this.prisma.dispute.findMany({
      where: { raisedById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────────
  listAll(status?: DisputeStatus) {
    return this.prisma.dispute.findMany({
      where: status ? { status } : {},
      include: {
        booking: { select: { id: true, status: true, serviceId: true } },
        raisedBy: { select: { role: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async resolve(adminUserId: string, disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: `dispute.${dto.status === DisputeStatus.resolved ? 'resolve' : 'reject'}`,
        entityType: 'dispute',
        entityId: disputeId,
        metadata: { resolution: dto.resolution },
      },
    });
    return updated;
  }
}
