import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildCrypto } from '../src/crypto/crypto.factory';
import type { CryptoService } from '../src/crypto/crypto.service';
import { IntegrationsAdminService } from '../src/modules/admin/integrations.service';

let crypto: CryptoService;

beforeAll(async () => {
  ({ crypto } = await buildCrypto({
    provider: 'local',
    keyfile: join(tmpdir(), `servora-int-kms-${Date.now()}.json`),
    seedSecret: 'integration-admin-test-secret',
  }));
});

/** In-memory Prisma double for the Integration + AuditLog tables. */
function fakePrisma() {
  const rows = new Map<string, any>();
  const audits: any[] = [];
  return {
    audits,
    integration: {
      findUnique: async ({ where }: any) => rows.get(where.provider) ?? null,
      findMany: async () => [...rows.values()],
      upsert: async ({ where, create, update }: any) => {
        const existing = rows.get(where.provider);
        const row = existing ? { ...existing, ...update } : { ...create };
        rows.set(where.provider, row);
        return row;
      },
    },
    auditLog: { create: async ({ data }: any) => (audits.push(data), data) },
  };
}

describe('IntegrationsAdminService — encrypted keys (§10/§A8)', () => {
  it('stores keys encrypted (never plaintext) and never returns secrets', async () => {
    const prisma = fakePrisma();
    let invalidated: string | undefined;
    const integrations = {
      getConfig: async () => ({ enabled: false, values: {} }),
      invalidate: (p: string) => (invalidated = p),
    } as any;
    const svc = new IntegrationsAdminService(prisma as any, crypto, integrations);

    const res = await svc.save('surepass', { token: 'sk_live_secret', baseUrl: 'https://x' }, true, 'admin1');
    expect(res.configured).toBe(true);
    expect(invalidated).toBe('surepass'); // applied with no redeploy

    const stored = await prisma.integration.findUnique({ where: { provider: 'surepass' } });
    expect(stored.encryptedConfig).not.toContain('sk_live_secret');
    expect(stored.encryptedConfig.startsWith('f1.')).toBe(true); // KMS envelope
    expect(prisma.audits[0].action).toBe('integration.save');
  });

  it('rejects unknown fields for a provider', async () => {
    const prisma = fakePrisma();
    const integrations = { getConfig: async () => ({ enabled: false, values: {} }), invalidate: () => {} } as any;
    const svc = new IntegrationsAdminService(prisma as any, crypto, integrations);
    await expect(svc.save('surepass', { bogus: 'x' }, undefined, 'a')).rejects.toThrow(/Unknown field/);
  });

  it('merges new keys with previously-stored ones', async () => {
    const prisma = fakePrisma();
    await prisma.integration.upsert({
      where: { provider: 'surepass' },
      create: {
        provider: 'surepass',
        encryptedConfig: crypto.encrypt(JSON.stringify({ token: 'old_token' })),
      },
      update: {},
    });
    const integrations = { getConfig: async () => ({ enabled: false, values: {} }), invalidate: () => {} } as any;
    const svc = new IntegrationsAdminService(prisma as any, crypto, integrations);

    await svc.save('surepass', { baseUrl: 'https://new' }, undefined, 'admin1');
    const stored = await prisma.integration.findUnique({ where: { provider: 'surepass' } });
    const merged = JSON.parse(crypto.decrypt(stored.encryptedConfig));
    expect(merged).toEqual({ token: 'old_token', baseUrl: 'https://new' });
  });
});
