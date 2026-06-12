import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface AuditEntry {
  actorId?: string | null; // null = system action
  action: string; // e.g. 'kyc.verify', 'payout.paid', 'payment.refund'
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Central audit log (§A9): who / what / when / where for admin actions,
 * payouts, integration-key changes, KYC decisions, refunds and PII access.
 * Best-effort — an audit write failure must never block the business action.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Audit write failed for ${entry.action}: ${(err as Error).message}`);
    }
  }
}
