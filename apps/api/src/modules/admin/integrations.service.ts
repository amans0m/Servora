import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { IntegrationProvider, Prisma } from '@prisma/client';

import {
  INTEGRATION_PROVIDER_KEYS,
  IntegrationsConfigService,
  providerFields,
  type IntegrationProviderKey,
} from '../../config/integrations-config.service';
import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../database/prisma.service';

/**
 * Admin → Integrations (Tech-Stack §10). Manages every third-party key:
 * stored ENCRYPTED in the DB, editable/testable/toggleable, applied instantly
 * (cache invalidation) with no redeploy. Secrets are NEVER returned to clients
 * — only which fields are set and the connection status.
 */
@Injectable()
export class IntegrationsAdminService {
  private readonly logger = new Logger(IntegrationsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly integrations: IntegrationsConfigService,
  ) {}

  /** One card per provider with masked status — no secrets exposed. */
  async list() {
    const rows = await this.prisma.integration.findMany();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return Promise.all(
      INTEGRATION_PROVIDER_KEYS.map(async (provider) => {
        const row = byProvider.get(provider as IntegrationProvider);
        const { values } = await this.integrations.getConfig(provider);
        const fields = providerFields(provider).map((field) => ({
          field,
          set: Boolean(values[field]),
        }));
        return {
          provider,
          enabled: row?.enabled ?? false,
          status: row?.status ?? 'not_set',
          lastTestedAt: row?.lastTestedAt ?? null,
          fields,
        };
      }),
    );
  }

  /** Save (merge) encrypted keys for a provider and apply immediately. */
  async save(
    provider: IntegrationProviderKey,
    values: Record<string, string>,
    enabled: boolean | undefined,
    adminUserId: string,
  ) {
    this.assertProvider(provider);
    const allowed = providerFields(provider);
    const unknown = Object.keys(values).filter((f) => !allowed.includes(f));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown field(s) for ${provider}: ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const merged = { ...(await this.decryptExisting(provider)), ...stripEmpty(values) };
    const encryptedConfig = this.crypto.encrypt(JSON.stringify(merged));
    const configured = Object.values(merged).some(Boolean);

    await this.prisma.integration.upsert({
      where: { provider: provider as IntegrationProvider },
      create: {
        provider: provider as IntegrationProvider,
        encryptedConfig,
        enabled: enabled ?? false,
        status: configured ? 'connected' : 'not_set',
        updatedById: adminUserId,
      },
      update: {
        encryptedConfig,
        ...(enabled === undefined ? {} : { enabled }),
        status: configured ? 'connected' : 'not_set',
        updatedById: adminUserId,
      },
    });
    this.integrations.invalidate(provider); // apply with no redeploy (§10)
    await this.audit(adminUserId, 'integration.save', provider, {
      fields: Object.keys(stripEmpty(values)),
    });
    return { saved: true, provider, configured };
  }

  async setEnabled(
    provider: IntegrationProviderKey,
    enabled: boolean,
    adminUserId: string,
  ) {
    this.assertProvider(provider);
    await this.prisma.integration.upsert({
      where: { provider: provider as IntegrationProvider },
      create: {
        provider: provider as IntegrationProvider,
        enabled,
        status: 'not_set',
        updatedById: adminUserId,
      },
      update: { enabled, updatedById: adminUserId },
    });
    this.integrations.invalidate(provider);
    await this.audit(adminUserId, 'integration.toggle', provider, { enabled });
    return { provider, enabled };
  }

  /** Test the key against the provider (here: configured-check; real ping TODO). */
  async test(provider: IntegrationProviderKey, adminUserId: string) {
    this.assertProvider(provider);
    const { values } = await this.integrations.getConfig(provider);
    const ok = providerFields(provider).every((f) => Boolean(values[f]));
    const status = ok ? 'connected' : 'not_set';
    await this.prisma.integration.upsert({
      where: { provider: provider as IntegrationProvider },
      create: {
        provider: provider as IntegrationProvider,
        status,
        lastTestedAt: new Date(),
        updatedById: adminUserId,
      },
      update: { status, lastTestedAt: new Date() },
    });
    await this.audit(adminUserId, 'integration.test', provider, { ok });
    return { provider, ok, status };
  }

  private async decryptExisting(
    provider: IntegrationProviderKey,
  ): Promise<Record<string, string>> {
    const row = await this.prisma.integration.findUnique({
      where: { provider: provider as IntegrationProvider },
    });
    if (!row?.encryptedConfig) return {};
    try {
      return JSON.parse(this.crypto.decrypt(row.encryptedConfig));
    } catch {
      return {};
    }
  }

  private assertProvider(provider: string): void {
    if (!INTEGRATION_PROVIDER_KEYS.includes(provider as IntegrationProviderKey)) {
      throw new BadRequestException(`Unknown integration provider: ${provider}`);
    }
  }

  private audit(
    actorId: string,
    action: string,
    provider: string,
    metadata: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'integration',
        entityId: provider,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}

function stripEmpty(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''));
}
