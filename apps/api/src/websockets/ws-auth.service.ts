import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { Env } from '../config/env.schema';
import type { JwtPayload } from '../modules/auth/strategies/jwt.strategy';

/**
 * Shared Socket.IO authentication (Tech-Stack §9.2 websockets/). Verifies the
 * JWT access token from the handshake (`auth.token` or `?token=`) using the
 * same secret as the REST guard, and attaches the principal to the socket.
 */
@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async authenticate(socket: Socket): Promise<AuthUser | null> {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      return { userId: payload.sub, role: payload.role };
    } catch (err) {
      this.logger.debug(`WS auth failed: ${(err as Error).message}`);
      return null;
    }
  }
}
