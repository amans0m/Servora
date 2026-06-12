import {
  Inject,
  Logger,
  forwardRef,
} from '@nestjs/common';
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

import { PrismaService } from '../../database/prisma.service';
import { WsAuthService } from '../../websockets/ws-auth.service';
import { DispatchService } from './dispatch.service';

const engineerRoom = (engineerId: string) => `engineer:${engineerId}`;

/**
 * Realtime dispatch gateway (§7). Engineers connect and receive `job:offer`
 * pushes with a countdown; they reply with `job:respond`. The server pushes
 * offers via offerToEngineer() from the dispatch matching engine.
 */
@WebSocketGateway({ namespace: '/dispatch', cors: { origin: true } })
export class DispatchGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DispatchGateway.name);

  @WebSocketServer() private readonly server!: Namespace;

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatch: DispatchService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const user = await this.wsAuth.authenticate(socket);
    if (!user || (user.role !== Role.engineer && user.role !== Role.admin)) {
      socket.disconnect(true);
      return;
    }
    socket.data.user = user;
    if (user.role === Role.engineer) {
      const engineer = await this.prisma.engineerProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true },
      });
      if (!engineer) {
        socket.disconnect(true);
        return;
      }
      socket.data.engineerId = engineer.id;
      await socket.join(engineerRoom(engineer.id));
      this.logger.debug(`Engineer ${engineer.id} connected to dispatch`);
    }
  }

  @SubscribeMessage('job:respond')
  async onRespond(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { assignmentId: string; accept: boolean },
  ) {
    const user = socket.data.user;
    if (!user) return { error: 'unauthenticated' };
    try {
      return await this.dispatch.respondToOffer(
        user.userId,
        body.assignmentId,
        !!body.accept,
      );
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  // ── Server → engineer pushes (called by DispatchService) ──
  offerToEngineer(engineerId: string, payload: Record<string, unknown>): void {
    this.server.to(engineerRoom(engineerId)).emit('job:offer', payload);
  }

  cancelOffer(engineerId: string, assignmentId: string): void {
    this.server.to(engineerRoom(engineerId)).emit('job:offer:expired', { assignmentId });
  }

  notifyAssigned(engineerId: string, bookingId: string): void {
    this.server.to(engineerRoom(engineerId)).emit('job:assigned', { bookingId });
  }
}
