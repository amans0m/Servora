import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildCrypto } from '../src/crypto/crypto.factory';
import type { CryptoService } from '../src/crypto/crypto.service';
import { OtpService } from '../src/modules/otp/otp.service';

let crypto: CryptoService;
beforeAll(async () => {
  ({ crypto } = await buildCrypto({
    provider: 'local',
    keyfile: join(tmpdir(), `servora-otp-kms-${Date.now()}.json`),
    seedSecret: 'otp-test-secret',
  }));
});

/** Minimal in-memory Prisma double for the Otp table. */
function fakePrisma() {
  const rows: any[] = [];
  let seq = 0;
  return {
    rows,
    otp: {
      create: async ({ data }: any) => {
        const row = {
          id: `otp_${++seq}`,
          createdAt: new Date(),
          consumedAt: null,
          attempts: 0,
          ...data,
        };
        rows.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }: any) => {
        let r = rows.filter(
          (x) =>
            x.bookingId === where.bookingId &&
            x.type === where.type &&
            x.consumedAt === null &&
            x.expiresAt > new Date(),
        );
        if (orderBy?.createdAt === 'desc') r = r.reverse();
        return r[0] ?? null;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((x) => x.id === where.id);
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        if (data.consumedAt) row.consumedAt = data.consumedAt;
        return row;
      },
    },
  };
}


describe('OtpService — payment-gated completion OTP (§6)', () => {
  it('start OTP is revealed to the customer and verifies once (single-use)', async () => {
    const prisma = fakePrisma();
    const svc = new OtpService(prisma as any, crypto);

    const code = await svc.revealStartCode('b1');
    expect(code).toMatch(/^\d{4}$/);

    expect(await svc.verifyStart('b1', code)).toBe(true);
    // consumed → no active OTP now
    await expect(svc.verifyStart('b1', code)).rejects.toThrow();
  });

  it('completion OTP is LOCKED until it is created (i.e. after capture)', async () => {
    const prisma = fakePrisma();
    const svc = new OtpService(prisma as any, crypto);

    // Before capture: no completion OTP exists → locked.
    expect(await svc.revealCompletionCode('b1')).toBeNull();

    // Simulate post-capture generation.
    await svc.createCompletionOtp('b1');
    const code = await svc.revealCompletionCode('b1');
    expect(code).toMatch(/^\d{4}$/);

    expect(await svc.verifyCompletion('b1', '0000' === code ? '1111' : '0000')).toBe(false);
    expect(await svc.verifyCompletion('b1', code!)).toBe(true);
  });

  it('rejects a wrong start code without consuming it', async () => {
    const prisma = fakePrisma();
    const svc = new OtpService(prisma as any, crypto);
    const code = await svc.revealStartCode('b2');
    const wrong = code === '9999' ? '1111' : '9999';
    expect(await svc.verifyStart('b2', wrong)).toBe(false);
    // still usable with the correct code
    expect(await svc.verifyStart('b2', code)).toBe(true);
  });
});
