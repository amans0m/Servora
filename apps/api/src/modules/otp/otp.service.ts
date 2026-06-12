import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OtpType, type Otp } from '@prisma/client';
import { randomInt, timingSafeEqual } from 'node:crypto';

import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';

const START_TTL_MS = 24 * 60 * 60 * 1000; // valid through the job
const COMPLETION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Start + completion OTPs (§6, §8.1). The completion OTP is created ONLY after
 * a successful payment capture and is what closes the job. Codes are stored
 * AES-encrypted (so they can be revealed to the customer) and are single-use
 * and rate-limited (§12).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // ── Start OTP (engineer arrival) ──────────────────────────────────────────
  /** Idempotently ensure a start OTP exists; returned to the customer to read. */
  async ensureStartOtp(bookingId: string): Promise<Otp> {
    const existing = await this.activeOtp(bookingId, OtpType.start);
    if (existing) return existing;
    return this.create(bookingId, OtpType.start, false, START_TTL_MS);
  }

  async revealStartCode(bookingId: string): Promise<string> {
    const otp = await this.ensureStartOtp(bookingId);
    return this.crypto.decrypt(otp.codeEnc);
  }

  verifyStart(bookingId: string, code: string): Promise<boolean> {
    return this.verify(bookingId, OtpType.start, code);
  }

  // ── Completion OTP (payment-gated) ────────────────────────────────────────
  /** Create + reveal the completion OTP. Call ONLY after a successful capture. */
  async createCompletionOtp(bookingId: string): Promise<Otp> {
    const existing = await this.activeOtp(bookingId, OtpType.completion);
    if (existing) return existing;
    this.logger.log(`Completion OTP generated for booking ${bookingId} (post-capture)`);
    return this.create(bookingId, OtpType.completion, true, COMPLETION_TTL_MS);
  }

  /** Reveal the completion code to the customer — only if it exists (i.e. paid). */
  async revealCompletionCode(bookingId: string): Promise<string | null> {
    const otp = await this.activeOtp(bookingId, OtpType.completion);
    if (!otp) return null; // locked until payment captured
    return this.crypto.decrypt(otp.codeEnc);
  }

  verifyCompletion(bookingId: string, code: string): Promise<boolean> {
    return this.verify(bookingId, OtpType.completion, code);
  }

  // ── Internals ──────────────────────────────────────────────────────────────
  private async create(
    bookingId: string,
    type: OtpType,
    paymentGated: boolean,
    ttlMs: number,
  ): Promise<Otp> {
    const code = randomInt(1000, 10000).toString();
    return this.prisma.otp.create({
      data: {
        bookingId,
        type,
        codeEnc: this.crypto.encrypt(code),
        paymentGated,
        revealedAt: new Date(),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
  }

  private activeOtp(bookingId: string, type: OtpType): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where: { bookingId, type, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async verify(
    bookingId: string,
    type: OtpType,
    code: string,
  ): Promise<boolean> {
    const otp = await this.activeOtp(bookingId, type);
    if (!otp) throw new BadRequestException('No active OTP — request a new one');
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts; OTP locked');
    }
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const actual = this.crypto.decrypt(otp.codeEnc);
    if (!constantTimeEqual(actual, code)) return false;

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() }, // single-use
    });
    return true;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
