import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JobEventType, PaymentStatus, type Payment } from '@prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { OtpService } from '../otp/otp.service';
import { RAZORPAY_CLIENT, type RazorpayClient } from './razorpay.client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
    @Inject(RAZORPAY_CLIENT) private readonly razorpay: RazorpayClient,
  ) {}

  /** Refund a captured payment (super-admin only, audited — §A9). */
  async refund(bookingId: string, adminUserId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment) throw new NotFoundException('No payment for this booking');
    if (payment.status !== PaymentStatus.captured || !payment.razorpayPaymentId) {
      throw new BadRequestException('Only a captured payment can be refunded');
    }
    const result = await this.razorpay.refund(
      payment.razorpayPaymentId,
      Number(payment.amount),
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.refunded },
    });
    await this.audit.record({
      actorId: adminUserId,
      action: 'payment.refund',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { bookingId, refundId: result.refundId, amount: Number(payment.amount), reason },
    });
    return { refunded: true, refundId: result.refundId };
  }

  /**
   * At booking: create a Razorpay order with manual capture and mark the
   * method authorized — NO money is captured yet (§6).
   */
  async createOrderForBooking(bookingId: string, amount: number): Promise<Payment | null> {
    if (amount <= 0) return null;
    const existing = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const payment = await this.prisma.payment.create({
      data: { bookingId, amount, status: PaymentStatus.created },
    });
    const order = await this.razorpay.createOrder(amount, bookingId);
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayOrderId: order.orderId,
        status: PaymentStatus.authorized, // method verified, not captured
        authorizedAt: new Date(),
      },
    });
  }

  /**
   * At completion: CAPTURE the authorized amount. On success the completion
   * OTP is generated/revealed (§6) — the single gate that lets the job close.
   */
  async capture(bookingId: string, method: string, paymentId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment) throw new NotFoundException('No payment/order for this booking');
    if (payment.status === PaymentStatus.captured) {
      // Idempotent: ensure the OTP exists and return success.
      await this.otp.createCompletionOtp(bookingId);
      return { captured: true };
    }
    if (payment.status !== PaymentStatus.authorized) {
      throw new BadRequestException(
        `Payment is '${payment.status}', expected an authorized order`,
      );
    }

    const result = await this.razorpay.capture(
      paymentId,
      payment.razorpayOrderId ?? bookingId,
      Number(payment.amount),
    );
    if (!result.captured) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });
      throw new BadRequestException('Payment capture failed');
    }

    await this.markCaptured(bookingId, method, result.paymentId);
    return { captured: true };
  }

  /** Mark a payment captured + generate the completion OTP. Idempotent. */
  async markCaptured(bookingId: string, method: string, paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment || payment.status === PaymentStatus.captured) {
      await this.otp.createCompletionOtp(bookingId);
      return;
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.captured,
        method,
        razorpayPaymentId: paymentId,
        capturedAt: new Date(),
      },
    });
    await this.prisma.jobEvent.create({
      data: {
        bookingId,
        type: JobEventType.payment_captured,
        metadata: { method, paymentId },
      },
    });
    // The payment-gated completion OTP is created ONLY here (post-capture).
    await this.otp.createCompletionOtp(bookingId);
    this.logger.log(`Payment captured for booking ${bookingId} → completion OTP issued`);
  }

  /** Razorpay webhook: on a capture event, finalise the capture idempotently. */
  async handleWebhook(rawBody: string, signature: string) {
    const valid = await this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string } } };
    };
    if (!event.event?.includes('captured')) return { ignored: true };

    const entity = event.payload?.payment?.entity;
    const orderId = entity?.order_id;
    if (!orderId) return { ignored: true };

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) return { ignored: true };

    await this.markCaptured(
      payment.bookingId,
      entity?.method ?? 'unknown',
      entity?.id ?? 'unknown',
    );
    return { ok: true };
  }
}
