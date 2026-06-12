import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import type { Env } from '../../config/env.schema';
import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import { SecurityEventsService } from '../../observability/security-events.service';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import { LoginOtpStore } from './login-otp.store';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceLabel?: string;
}

/** Refresh-token JWT payload: adds a token id + session family (§A2). */
interface RefreshPayload extends JwtPayload {
  jti: string;
  familyId: string;
}

// argon2id is the recommended variant (§A2).
const ARGON2_OPTS: argon2.Options = { type: argon2.argon2id };

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  // Verified against on unknown-user login to equalise timing (§A6).
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash('servora-dummy-password', ARGON2_OPTS);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly otpStore: LoginOtpStore,
    private readonly crypto: CryptoService,
    private readonly security: SecurityEventsService,
  ) {}

  // ── Registration ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto, device: DeviceInfo = {}): Promise<AuthTokens> {
    if (dto.role !== Role.customer && dto.role !== Role.engineer) {
      throw new ConflictException('Only customer or engineer can self-register');
    }
    // Uniform message — don't reveal which field (or that an account) exists
    // (§A6 no enumeration). True elimination needs async email/SMS verification;
    // tracked as a follow-up.
    const taken =
      (dto.email && (await this.users.findByEmail(dto.email))) ||
      (dto.phone && (await this.users.findByPhone(dto.phone)));
    if (taken) {
      throw new ConflictException('Unable to register with the provided details');
    }

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTS);
    const user = await this.users.create({
      role: dto.role,
      // PII encrypted at rest; blind index enables login lookup (§A1).
      email: dto.email ? this.crypto.encrypt(dto.email) : null,
      emailIndex: dto.email ? this.crypto.blindIndex(dto.email) : null,
      phone: dto.phone ? this.crypto.encrypt(dto.phone) : null,
      phoneIndex: dto.phone ? this.crypto.blindIndex(dto.phone) : null,
      passwordHash,
      ...(dto.role === Role.customer
        ? { customerProfile: { create: { companyName: dto.name } } }
        : { engineerProfile: { create: { fullName: dto.name } } }),
    });

    return this.issueTokens(user.id, user.role, device);
  }

  // ── Password login ─────────────────────────────────────────────────────────
  async login(dto: LoginDto, device: DeviceInfo = {}): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    // Uniform failure (verify a dummy hash when user/hash absent) — no
    // user enumeration and constant-ish timing (§A6).
    const hash = user?.passwordHash ?? this.dummyHash;
    const valid = await argon2.verify(hash, dto.password).catch(() => false);
    if (!user || !user.passwordHash || !valid || user.status !== 'active') {
      // Track anomalies on the hashed identity (never the raw email, §A9).
      await this.security.failedLogin(this.crypto.blindIndex(dto.email));
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.role, device);
  }

  // ── SMS OTP login ──────────────────────────────────────────────────────────
  /** Issue a login OTP. Returns the code in dev so login is testable locally. */
  async requestOtp(phone: string): Promise<{ sent: boolean; devCode?: string }> {
    let code: string;
    try {
      code = await this.otpStore.issue(phone);
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Phase 2: log instead of sending via MSG91 (no real keys needed).
    this.logger.log(`Login OTP requested for ${maskPhone(phone)}`);
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return { sent: true, ...(isProd ? {} : { devCode: code }) };
  }

  async verifyOtp(
    phone: string,
    code: string,
    device: DeviceInfo = {},
  ): Promise<AuthTokens> {
    if (!(await this.otpStore.verify(phone, code))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const user = await this.users.findByPhone(phone);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    return this.issueTokens(user.id, user.role, device);
  }

  // ── Refresh & logout ───────────────────────────────────────────────────────
  async refresh(refreshToken: string, device: DeviceInfo = {}): Promise<AuthTokens> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });

    // Unknown jti, or a token already revoked/rotated being presented again →
    // reuse / theft. Revoke the WHOLE family and force re-login (§A2).
    if (!stored) {
      await this.revokeFamily(payload.familyId);
      throw new UnauthorizedException('Refresh token not recognised');
    }
    if (stored.revokedAt) {
      this.security.refreshReuse(stored.familyId);
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    // Integrity: the presented token must match the stored hash.
    if (!(await argon2.verify(stored.tokenHash, refreshToken).catch(() => false))) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token mismatch');
    }
    // Device binding: if the session was bound, the device must match (§A2).
    if (stored.deviceId && device.deviceId && stored.deviceId !== device.deviceId) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token device mismatch');
    }

    // Rotate within the same family.
    const next = await this.issueTokens(payload.sub, payload.role, {
      deviceId: stored.deviceId ?? device.deviceId,
      deviceLabel: stored.deviceLabel ?? device.deviceLabel,
      familyId: stored.familyId,
    });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: next.jti },
    });
    return next.tokens;
  }

  /** Logout this session (its family). Falls back to all if no token given. */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const payload = this.jwt.decode(refreshToken) as RefreshPayload | null;
      if (payload?.familyId) {
        await this.revokeFamily(payload.familyId);
        return;
      }
    }
    await this.logoutAll(userId);
  }

  /** Logout everywhere — revoke every active session for the user (§A2). */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── Token issuance ─────────────────────────────────────────────────────────
  private async issueTokens(
    userId: string,
    role: Role,
    opts: DeviceInfo & { familyId?: string } = {},
  ): Promise<AuthTokens & { jti: string; tokens: AuthTokens }> {
    const familyId = opts.familyId ?? randomUUID();
    const jti = randomUUID();
    // Access token carries no PII and no jti — only id + role (§A1).
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role } satisfies JwtPayload,
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, role, jti, familyId } satisfies RefreshPayload,
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
      },
    );

    // Persist only a hash of the refresh token (§A2 — never plaintext).
    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti,
        familyId,
        tokenHash: await argon2.hash(refreshToken, ARGON2_OPTS),
        deviceId: opts.deviceId,
        deviceLabel: opts.deviceLabel,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    const tokens: AuthTokens = { accessToken, refreshToken };
    return { ...tokens, jti, tokens };
  }
}

function maskPhone(phone: string): string {
  return phone.length <= 4 ? '****' : `****${phone.slice(-4)}`;
}
