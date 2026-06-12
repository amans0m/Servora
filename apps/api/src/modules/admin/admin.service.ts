import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  EngineerAvailability,
  PaymentStatus,
  PayoutStatus,
} from '@prisma/client';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.dispatching,
  BookingStatus.assigned,
  BookingStatus.en_route,
  BookingStatus.in_progress,
  BookingStatus.awaiting_payment,
];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // ── Dashboard (KPIs + recent jobs + 7-day revenue) ────────────────────────
  async dashboard() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      revenueAgg,
      commissionAgg,
      activeJobs,
      engineersOnline,
      pendingPayouts,
      recentJobs,
      capturedPayments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.captured },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({ _sum: { commissionAmount: true } }),
      this.prisma.booking.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.engineerProfile.count({
        where: { availability: EngineerAvailability.online },
      }),
      this.prisma.payout.aggregate({
        where: { status: { in: [PayoutStatus.pending, PayoutStatus.queued, PayoutStatus.processing] } },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { name: true } },
          customer: { select: { companyName: true } },
          engineer: { select: { fullName: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.captured, capturedAt: { gte: since } },
        select: { amount: true, capturedAt: true },
      }),
    ]);

    return {
      kpis: {
        revenue: Number(revenueAgg._sum.amount ?? 0),
        commission: Number(commissionAgg._sum.commissionAmount ?? 0),
        activeJobs,
        engineersOnline,
        pendingPayouts: {
          count: pendingPayouts._count,
          amount: Number(pendingPayouts._sum.netAmount ?? 0),
        },
      },
      recentJobs,
      revenue7d: bucketByDay(
        capturedPayments.map((p) => ({ at: p.capturedAt!, amount: Number(p.amount) })),
        since,
      ),
    };
  }

  // ── Customers table (company, jobs, LTV, engineer-given rating, status) ───
  async customers(adminUserId: string) {
    // Reading decrypted PII (emails) is audit-logged (§A7/§A9).
    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'pii.read',
        entityType: 'customers',
        metadata: { view: 'admin.customers' },
      },
    });
    const [customers, ltvRows, ratingRows] = await Promise.all([
      this.prisma.customerProfile.findMany({
        include: {
          user: { select: { email: true, status: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.$queryRaw<Array<{ customerId: string; ltv: number }>>`
        SELECT b."customerId" AS "customerId", COALESCE(SUM(p.amount), 0)::float AS ltv
        FROM "Payment" p JOIN "Booking" b ON b.id = p."bookingId"
        WHERE p.status = 'captured'
        GROUP BY b."customerId"`,
      this.prisma.$queryRaw<Array<{ customerId: string; avg: number }>>`
        SELECT b."customerId" AS "customerId", AVG(r.stars)::float AS avg
        FROM "Rating" r JOIN "Booking" b ON b.id = r."bookingId"
        WHERE r.type = 'customer'
        GROUP BY b."customerId"`,
    ]);

    const ltv = new Map(ltvRows.map((r) => [r.customerId, r.ltv]));
    const engineerRating = new Map(ratingRows.map((r) => [r.customerId, r.avg]));

    return customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      email: this.crypto.decryptMaybe(c.user.email), // admin PII view (audited in A9)
      gstStatus: c.gstStatus,
      status: c.user.status,
      jobs: c._count.bookings,
      lifetimeValue: ltv.get(c.id) ?? 0,
      engineerGivenRating: engineerRating.get(c.id) ?? null, // private signal (§8.3)
    }));
  }

  // ── Payments & payouts table (reconciliation) ─────────────────────────────
  async transactions() {
    const [toCollectAgg, commissionAgg, pendingPayoutAgg, rows] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: BookingStatus.awaiting_payment },
        _sum: { total: true },
      }),
      this.prisma.payout.aggregate({ _sum: { commissionAmount: true } }),
      this.prisma.payout.aggregate({
        where: { status: { not: PayoutStatus.paid } },
        _sum: { netAmount: true },
      }),
      this.prisma.booking.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { name: true } },
          customer: { select: { companyName: true } },
          payment: true,
          payout: true,
        },
      }),
    ]);

    return {
      kpis: {
        toCollectOnCompletion: Number(toCollectAgg._sum.total ?? 0),
        commission: Number(commissionAgg._sum.commissionAmount ?? 0),
        pendingPayouts: Number(pendingPayoutAgg._sum.netAmount ?? 0),
      },
      transactions: rows.map((b) => ({
        jobId: b.id,
        customer: b.customer.companyName,
        service: b.service?.name ?? 'Custom',
        customerPaid:
          b.payment?.status === PaymentStatus.captured ? Number(b.payment.amount) : null,
        engineerPayout: b.payout ? Number(b.payout.netAmount) : null,
        commission: b.payout ? Number(b.payout.commissionAmount) : null,
        state:
          b.payment?.status === PaymentStatus.captured
            ? 'captured'
            : 'charges_on_completion',
      })),
    };
  }

  // ── Audit log (PII access + admin actions — §12) ──────────────────────────
  auditLogs() {
    return this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true, role: true } } },
    });
  }
}

/** Bucket amounts into per-day totals for the last 7 days. */
function bucketByDay(items: Array<{ at: Date; amount: number }>, since: Date) {
  const days: Array<{ date: string; revenue: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    days.push({ date: d.toISOString().slice(0, 10), revenue: 0 });
  }
  const index = new Map(days.map((d, i) => [d.date, i]));
  for (const item of items) {
    const key = item.at.toISOString().slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) days[i].revenue += item.amount;
  }
  return days.map((d) => ({ ...d, revenue: Math.round(d.revenue * 100) / 100 }));
}
