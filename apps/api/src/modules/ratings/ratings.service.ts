import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  RatingType,
  RatingVisibility,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { RateByCustomerDto, RatingInputDto } from './dto/ratings.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Customer → engineer (public) + customer → platform (internal) ─────────
  async rateByCustomer(userId: string, bookingId: string, dto: RateByCustomerDto) {
    const booking = await this.requireCompletedBookingForCustomer(userId, bookingId);
    if (!booking.engineerId) {
      throw new BadRequestException('Booking has no engineer to rate');
    }
    const existing = await this.prisma.rating.findUnique({
      where: { bookingId_type: { bookingId, type: RatingType.engineer } },
    });
    if (existing) throw new ConflictException('You already rated this job');

    await this.prisma.$transaction([
      this.prisma.rating.create({
        data: {
          bookingId,
          authorId: userId,
          type: RatingType.engineer,
          visibility: RatingVisibility.public,
          stars: dto.engineer.stars,
          tags: dto.engineer.tags ?? [],
          review: dto.engineer.review,
        },
      }),
      this.prisma.rating.create({
        data: {
          bookingId,
          authorId: userId,
          type: RatingType.platform,
          visibility: RatingVisibility.internal,
          stars: dto.platform.stars,
          tags: dto.platform.tags ?? [],
          review: dto.platform.review,
        },
      }),
    ]);

    await this.rollUpEngineerRating(booking.engineerId, dto.engineer.stars);
    if (booking.serviceId) await this.recomputeServiceRating(booking.serviceId);
    return { rated: true };
  }

  // ── Engineer → customer (admin-only) ──────────────────────────────────────
  async rateByEngineer(userId: string, bookingId: string, dto: RatingInputDto) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!engineer) throw new NotFoundException('Engineer profile not found');

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.engineerId !== engineer.id) {
      throw new ForbiddenException('You were not assigned to this job');
    }
    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException('You can rate only after completion');
    }
    const existing = await this.prisma.rating.findUnique({
      where: { bookingId_type: { bookingId, type: RatingType.customer } },
    });
    if (existing) throw new ConflictException('You already rated this customer');

    await this.prisma.rating.create({
      data: {
        bookingId,
        authorId: userId,
        type: RatingType.customer,
        visibility: RatingVisibility.admin_only,
        stars: dto.stars,
        tags: dto.tags ?? [],
        review: dto.review,
      },
    });
    return { rated: true };
  }

  // ── Public reads ───────────────────────────────────────────────────────────
  /** Public engineer reviews (engineer profile / service detail). */
  engineerReviews(engineerId: string) {
    return this.prisma.rating.findMany({
      where: {
        type: RatingType.engineer,
        visibility: RatingVisibility.public,
        booking: { engineerId },
      },
      select: { stars: true, tags: true, review: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  serviceReviews(serviceId: string) {
    return this.prisma.rating.findMany({
      where: {
        type: RatingType.engineer,
        visibility: RatingVisibility.public,
        booking: { serviceId },
      },
      select: { stars: true, tags: true, review: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Admin-only: how engineers rate a customer (§8.3) ──────────────────────
  customerRatings(customerId: string) {
    return this.prisma.rating.findMany({
      where: { type: RatingType.customer, booking: { customerId } },
      select: { stars: true, tags: true, review: true, createdAt: true, bookingId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────
  private async requireCompletedBookingForCustomer(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customer.userId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException('You can rate only after completion');
    }
    return booking;
  }

  /** Incremental running average on the engineer profile (public signal). */
  private async rollUpEngineerRating(engineerId: string, stars: number) {
    const engineer = await this.prisma.engineerProfile.findUnique({
      where: { id: engineerId },
      select: { rating: true, ratingCount: true },
    });
    if (!engineer) return;
    const count = engineer.ratingCount + 1;
    const avg = (engineer.rating * engineer.ratingCount + stars) / count;
    await this.prisma.engineerProfile.update({
      where: { id: engineerId },
      data: { rating: round2(avg), ratingCount: count },
    });
  }

  private async recomputeServiceRating(serviceId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: {
        type: RatingType.engineer,
        booking: { serviceId },
      },
      _avg: { stars: true },
    });
    if (agg._avg.stars != null) {
      await this.prisma.service.update({
        where: { id: serviceId },
        data: { rating: round2(agg._avg.stars) },
      });
    }
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
