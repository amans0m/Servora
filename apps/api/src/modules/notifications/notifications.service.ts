import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

import {
  IntegrationsConfigService,
  type IntegrationProviderKey,
} from '../../config/integrations-config.service';
import { PrismaService } from '../../database/prisma.service';

/** Which integration backs each channel (§4). */
const CHANNEL_PROVIDER: Record<NotificationChannel, IntegrationProviderKey> = {
  push: 'fcm',
  sms: 'msg91',
  email: 'email',
};

/**
 * Notifications log + dispatch (§4, §9.2 notifications/). Records every
 * notification and "sends" it via the channel's provider. With no provider
 * keys configured it logs and marks the row sent (mock) so the app runs
 * locally; real FCM/MSG91/SES calls slot in behind the same method.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsConfigService,
  ) {}

  /** Record + send a single notification. */
  async send(
    userId: string,
    channel: NotificationChannel,
    template: string,
    payload?: Record<string, unknown>,
  ) {
    const record = await this.prisma.notification.create({
      data: {
        userId,
        channel,
        template,
        payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
        status: NotificationStatus.queued,
      },
    });

    try {
      const { enabled, values } = await this.integrations.getConfig(
        CHANNEL_PROVIDER[channel],
      );
      const configured = Object.values(values).some(Boolean);
      if (!enabled && !configured) {
        this.logger.log(
          `[mock ${channel}] → user ${userId}: ${template} ${JSON.stringify(payload ?? {})}`,
        );
      }
      // Real provider call would happen here when configured.
      return this.prisma.notification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.sent, sentAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Notification ${record.id} failed: ${(err as Error).message}`);
      return this.prisma.notification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.failed },
      });
    }
  }

  /** Convenience: notify across several channels. Best-effort. */
  async notify(
    userId: string,
    template: string,
    payload?: Record<string, unknown>,
    channels: NotificationChannel[] = [NotificationChannel.push],
  ) {
    await Promise.allSettled(
      channels.map((c) => this.send(userId, c, template, payload)),
    );
  }

  /** A user's notification inbox. */
  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
