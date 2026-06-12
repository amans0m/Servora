import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  BookingType,
  JobEventType,
  Prisma,
  Role,
} from '@prisma/client';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CouponsService } from '../coupons/coupons.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { PaymentsService } from '../payments/payments.service';
import type {
  CreateBookingDto,
  CreateCustomRequestDto,
} from './dto/bookings.dto';

// GST on services (pay-on-completion total shown to the customer up front).
const TAX_RATE = 0.18;

type ListFilter = 'all' | 'active' | 'scheduled' | 'completed' | 'quote';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.dispatching,
  BookingStatus.assigned,
  BookingStatus.en_route,
  BookingStatus.in_progress,
  BookingStatus.awaiting_payment,
];

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    private readonly dispatch: DispatchService,
    private readonly payments: PaymentsService,
    private readonly crypto: CryptoService,
    private readonly storage: StorageService,
  ) {}

  /** Decrypt the address PII fields on a booking for an authorized viewer. */
  private decryptBookingAddress<T extends { address?: any | null }>(booking: T): T {
    if (booking.address) {
      booking.address.line1 = this.crypto.decryptMaybe(booking.address.line1);
      booking.address.line2 = this.crypto.decryptMaybe(booking.address.line2);
      booking.address.pincode = this.crypto.decryptMaybe(booking.address.pincode);
    }
    return booking;
  }

  // ── Confirm booking — NO charge taken here (§6, §8.1) ────────────────────
  async createBooking(userId: string, dto: CreateBookingDto) {
    const customer = await this.requireCustomer(userId);

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: { addons: true },
    });
    if (!service || !service.active) {
      throw new BadRequestException('Service is not available');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, customerId: customer.id },
    });
    if (!address) throw new BadRequestException('Address not found for this customer');

    // Snapshot add-on prices at booking time.
    const selectedAddons = (dto.addonIds ?? []).map((id) => {
      const addon = service.addons.find((a) => a.id === id && a.active);
      if (!addon) {
        throw new BadRequestException(`Add-on ${id} is not available for this service`);
      }
      return addon;
    });

    const subtotal = round2(
      Number(service.basePrice) +
        selectedAddons.reduce((sum, a) => sum + Number(a.price), 0),
    );

    // Apply coupon (validated against the order) — discount only, no charge.
    let discount = 0;
    let couponId: string | null = null;
    if (dto.couponCode) {
      const priced = await this.coupons.validateAndPrice(
        dto.couponCode,
        subtotal,
        service.category,
      );
      discount = priced.discount;
      couponId = priced.coupon.id;
    }

    const taxable = round2(subtotal - discount);
    const tax = round2(taxable * TAX_RATE);
    const total = round2(taxable + tax);

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          addressId: address.id,
          type: BookingType.standard,
          status: BookingStatus.confirmed,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          subtotal,
          discount,
          tax,
          total,
          couponId,
          addons: {
            create: selectedAddons.map((a) => ({
              addonId: a.id,
              price: a.price,
            })),
          },
          events: {
            create: [
              { type: JobEventType.created },
              { type: JobEventType.confirmed },
            ],
          },
        },
        include: { addons: true, service: true, address: true },
      });

      if (couponId) {
        await this.coupons.redeemTx(tx, couponId, created.id, customer.id, discount);
      }
      return created;
    });

    // Authorize the payment method up front — create a Razorpay order with
    // manual capture. NO money is captured here (§6).
    try {
      await this.payments.createOrderForBooking(booking.id, Number(booking.total));
    } catch (err) {
      this.logger.warn(
        `Could not create payment order for ${booking.id}: ${(err as Error).message}`,
      );
    }

    // Immediate bookings kick off auto-dispatch right away → Live tracking.
    // Scheduled future bookings are dispatched closer to their time.
    const immediate = !booking.scheduledAt || booking.scheduledAt <= new Date();
    if (immediate) {
      try {
        await this.dispatch.startDispatch(booking.id);
      } catch (err) {
        // Don't fail the booking if dispatch can't start (e.g. Redis down).
        this.logger.warn(
          `Auto-dispatch did not start for ${booking.id}: ${(err as Error).message}`,
        );
      }
    }

    return this.decryptBookingAddress(booking);
  }

  // ── Custom request → admin quote (status QUOTE) ──────────────────────────
  async createCustomRequest(userId: string, dto: CreateCustomRequestDto) {
    const customer = await this.requireCustomer(userId);
    return this.prisma.booking.create({
      data: {
        customerId: customer.id,
        type: BookingType.custom_quote,
        status: BookingStatus.pending_quote,
        customDescription: dto.description,
        addressId: dto.addressId ?? null,
        scheduledAt: dto.preferredTime ? new Date(dto.preferredTime) : null,
        events: { create: [{ type: JobEventType.created }] },
      },
    });
  }

  // ── Lists ─────────────────────────────────────────────────────────────────
  async listForCustomer(userId: string, filter: ListFilter = 'all') {
    const customer = await this.requireCustomer(userId);
    return this.prisma.booking.findMany({
      where: { customerId: customer.id, ...this.filterWhere(filter) },
      include: { service: true, engineer: { select: { fullName: true, rating: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin jobs table (All / Active / Quote / Completed). */
  listAll(filter: ListFilter = 'all') {
    return this.prisma.booking.findMany({
      where: this.filterWhere(filter),
      include: {
        service: true,
        customer: { select: { companyName: true } },
        engineer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(userId: string, role: Role, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        address: true,
        addons: { include: { addon: true } },
        events: { orderBy: { createdAt: 'asc' } },
        customer: { select: { userId: true, companyName: true } },
        engineer: { select: { userId: true, fullName: true, rating: true } },
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertCanView(booking, userId, role);
    // Turn stored proof keys into short-lived signed read URLs (§A5).
    for (const ev of booking.events) {
      const meta = ev.metadata as { key?: string } | null;
      if (ev.type === JobEventType.proof_uploaded && meta?.key) {
        (ev.metadata as Record<string, unknown>).url = await this.storage.signedReadUrl(
          meta.key,
        );
      }
    }
    // Minimal DTO: the counterparty's internal userId is needed only for the
    // ownership check above — never expose it in the response (§A6).
    if (booking.customer) delete (booking.customer as { userId?: string }).userId;
    if (booking.engineer) delete (booking.engineer as { userId?: string }).userId;
    return this.decryptBookingAddress(booking);
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  async reschedule(userId: string, bookingId: string, scheduledAt: string) {
    const booking = await this.requireOwnedBooking(userId, bookingId);
    const blocked: BookingStatus[] = [
      BookingStatus.completed,
      BookingStatus.cancelled,
      BookingStatus.in_progress,
    ];
    if (blocked.includes(booking.status)) {
      throw new BadRequestException(`Cannot reschedule a ${booking.status} booking`);
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        scheduledAt: new Date(scheduledAt),
        events: {
          create: { type: JobEventType.rescheduled, metadata: { scheduledAt } },
        },
      },
    });
  }

  async cancel(userId: string, role: Role, bookingId: string, reason?: string) {
    const booking =
      role === Role.admin
        ? await this.requireBooking(bookingId)
        : await this.requireOwnedBooking(userId, bookingId);
    if (booking.status === BookingStatus.completed) {
      throw new BadRequestException('Completed bookings cannot be cancelled');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.cancelled,
        events: { create: { type: JobEventType.cancelled, metadata: { reason } } },
      },
    });
  }

  /** Admin sets the price for a custom request → it becomes bookable. */
  async quote(bookingId: string, amount: number) {
    const booking = await this.requireBooking(bookingId);
    if (booking.type !== BookingType.custom_quote) {
      throw new BadRequestException('Only custom requests can be quoted');
    }
    const subtotal = round2(amount);
    const tax = round2(subtotal * TAX_RATE);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        subtotal,
        discount: 0,
        tax,
        total: round2(subtotal + tax),
        status: BookingStatus.confirmed,
        events: { create: { type: JobEventType.quoted, metadata: { amount } } },
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private filterWhere(filter: ListFilter): Prisma.BookingWhereInput {
    switch (filter) {
      case 'active':
        return { status: { in: ACTIVE_STATUSES } };
      case 'scheduled':
        return { status: BookingStatus.confirmed, scheduledAt: { gt: new Date() } };
      case 'completed':
        return { status: BookingStatus.completed };
      case 'quote':
        return { status: BookingStatus.pending_quote };
      default:
        return {};
    }
  }

  private assertCanView(
    booking: { customer: { userId: string }; engineer: { userId: string } | null },
    userId: string,
    role: Role,
  ) {
    if (role === Role.admin) return;
    if (role === Role.customer && booking.customer.userId === userId) return;
    if (role === Role.engineer && booking.engineer?.userId === userId) return;
    throw new ForbiddenException('You do not have access to this booking');
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');
    return customer;
  }

  private async requireBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async requireOwnedBooking(userId: string, bookingId: string) {
    const customer = await this.requireCustomer(userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId: customer.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
