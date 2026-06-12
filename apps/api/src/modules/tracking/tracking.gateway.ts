import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import type { Namespace, Socket } from 'socket.io';

import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { GeoService } from '../../redis/geo.service';
import { WsAuthService } from '../../websockets/ws-auth.service';

const bookingRoom = (bookingId: string) => `booking:${bookingId}`;

/**
 * Live-tracking gateway (§7). The assigned engineer streams `location:update`
 * for a booking; the customer (and admin) `track:subscribe` to follow on the
 * map. Engineer pings also refresh the Redis GEO index used by dispatch.
 */
@WebSocketGateway({ namespace: '/tracking', cors: { origin: true } })
export class TrackingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer() private readonly server!: Namespace;

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const user = await this.wsAuth.authenticate(socket);
    if (!user) {
      socket.disconnect(true);
      return;
    }
    socket.data.user = user;
    if (user.role === Role.engineer) {
      const engineer = await this.prisma.engineerProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true },
      });
      socket.data.engineerId = engineer?.id;
    }
  }

  /** Customer/engineer/admin subscribes to a booking's live updates. */
  @SubscribeMessage('track:subscribe')
  async onSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { bookingId: string },
  ) {
    const user = socket.data.user as AuthUser | undefined;
    if (!user) return { error: 'unauthenticated' };
    const allowed = await this.canAccessBooking(body.bookingId, user, socket);
    if (!allowed) return { error: 'forbidden' };
    await socket.join(bookingRoom(body.bookingId));
    return { subscribed: true };
  }

  /** Assigned engineer pushes their live position. */
  @SubscribeMessage('location:update')
  async onLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { bookingId: string; lat: number; lng: number },
  ) {
    const engineerId = socket.data.engineerId as string | undefined;
    if (!engineerId) return { error: 'not-an-engineer' };

    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingId },
      select: { engineerId: true },
    });
    if (!booking || booking.engineerId !== engineerId) {
      return { error: 'not-assigned-to-this-job' };
    }

    await this.geo.upsertEngineer(engineerId, body.lng, body.lat);
    this.server.to(bookingRoom(body.bookingId)).emit('engineer:location', {
      lat: body.lat,
      lng: body.lng,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  private async canAccessBooking(
    bookingId: string,
    user: AuthUser,
    socket: Socket,
  ): Promise<boolean> {
    if (user.role === Role.admin) return true;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { userId: true } } },
    });
    if (!booking) return false;
    if (user.role === Role.customer) return booking.customer.userId === user.userId;
    if (user.role === Role.engineer) {
      return booking.engineerId === (socket.data.engineerId as string | undefined);
    }
    return false;
  }
}
