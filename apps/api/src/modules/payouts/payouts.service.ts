import { InjectQueue } from '@nestjs/bullmq';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, PayoutStatus, type EngineerTier } from '@prisma/client';
import { Queue } from 'bullmq';

import { NotificationChannel } from '@prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DEFAULT_COMMISSION, PAYOUTS_QUEUE } from './payouts.constants';
import { RAZORPAYX_CLIENT, type RazorpayXClient } from './razorpayx.client';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @InjectQueue(PAYOUTS_QUEUE) private readonly queue: Queue,
    @Inject(RAZORPAYX_CLIENT) private readonly razorpayx: RazorpayXClient,
  ) {}

  /** Tier-based commission rate (§6); DB-defined, with a safe fallback. */
  async commissionRate(tier: EngineerTier): Promise<number> {
    const def = await this.prisma.tierDefinition.findUnique({ where: { tier } });
    return def ? Number(def.commissionRate) : DEFAULT_COMMISSION[tier];
  }

  /**
   * Queue an engineer payout for a completed, captured job: net = captured
   * amount − tier commission (§6). Enqueues the actual RazorpayX call.
   */
  async queuePayout(bookingId: string) {
    const existing = await this.prisma.payout.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { engineer: true, payment: true },
    });
    if (!booking?.engineer) throw new NotFoundException('No engineer on this booking');
    if (booking.payment?.status !== PaymentStatus.captured) {
      throw new NotFoundException('Payout requires a captured payment');
    }

    const gross = Number(booking.payment.amount);
    const rate = await this.commissionRate(booking.engineer.tier);
    const commissionAmount = round2(gross * rate);
    const netAmount = round2(gross - commissionAmount);

    const payout = await this.prisma.payout.create({
      data: {
        bookingId,
        engineerId: booking.engineer.id,
        grossAmount: gross,
        commissionRate: rate,
        commissionAmount,
        netAmount,
        status: PayoutStatus.queued,
      },
    });

    try {
      await this.queue.add(
        'release',
        { payoutId: payout.id },
        { jobId: `payout_${payout.id}`, removeOnComplete: true, attempts: 3 },
      );
    } catch (err) {
      this.logger.warn(`Could not enqueue payout (Redis?): ${(err as Error).message}`);
    }
    await this.audit.record({
      action: 'payout.queued',
      entityType: 'payout',
      entityId: payout.id,
      metadata: { engineerId: booking.engineer.id, gross, rate, netAmount },
    });
    this.logger.log(
      `Queued payout ${payout.id}: gross ₹${gross}, commission ${(rate * 100).toFixed(0)}% → net ₹${netAmount}`,
    );
    return payout;
  }

  /** Worker entrypoint: send the payout to RazorpayX. */
  async processPayout(payoutId: string): Promise<void> {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout || payout.status === PayoutStatus.paid) return;

    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.processing },
    });

    try {
      const result = await this.razorpayx.createPayout(
        Number(payout.netAmount),
        payout.id,
        payout.engineerId,
      );
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          razorpayXPayoutId: result.payoutId,
          status: result.status === 'processed' ? PayoutStatus.paid : PayoutStatus.processing,
          processedAt: result.status === 'processed' ? new Date() : null,
        },
      });
      this.logger.log(`Payout ${payoutId} → ${result.status} (${result.payoutId})`);
      if (result.status === 'processed') {
        await this.audit.record({
          action: 'payout.paid',
          entityType: 'payout',
          entityId: payoutId,
          metadata: { razorpayXPayoutId: result.payoutId, net: Number(payout.netAmount) },
        });
      }

      if (result.status === 'processed') {
        const engineer = await this.prisma.engineerProfile.findUnique({
          where: { id: payout.engineerId },
          select: { userId: true },
        });
        if (engineer) {
          await this.notifications.notify(
            engineer.userId,
            'payout_released',
            { payoutId, amount: Number(payout.netAmount) },
            [NotificationChannel.push, NotificationChannel.sms],
          );
        }
      }
    } catch (err) {
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.failed },
      });
      this.logger.error(`Payout ${payoutId} failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /** All payouts (super-admin reconciliation, §A4). */
  listAll() {
    return this.prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        engineer: { select: { fullName: true } },
        booking: { select: { id: true } },
      },
    });
  }

  /** Re-queue a failed payout (super-admin only, audit-logged, §A4/§A9). */
  async retry(adminUserId: string, payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === PayoutStatus.paid) {
      throw new NotFoundException('Payout already paid');
    }
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.queued },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'payout.retry',
        entityType: 'payout',
        entityId: payoutId,
      },
    });
    try {
      await this.queue.add('release', { payoutId }, { jobId: `payout_${payoutId}_retry_${Date.now()}` });
    } catch (err) {
      this.logger.warn(`Could not enqueue payout retry: ${(err as Error).message}`);
    }
    return { requeued: true, payoutId };
  }

  /** Engineer earnings: recent payouts + withdrawable summary. */
  async listForEngineer(userId: string) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');
    const payouts = await this.prisma.payout.findMany({
      where: { engineerId: engineer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const paid = payouts
      .filter((p) => p.status === PayoutStatus.paid)
      .reduce((sum, p) => sum + Number(p.netAmount), 0);
    return { totalPaid: round2(paid), payouts };
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
