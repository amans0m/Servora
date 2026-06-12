import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildCrypto } from '../src/crypto/crypto.factory';
import type { CryptoService } from '../src/crypto/crypto.service';
import type { KmsService } from '../src/crypto/kms.service';

let crypto: CryptoService;
let kms: KmsService;

beforeAll(async () => {
  ({ crypto, kms } = await buildCrypto({
    provider: 'local',
    keyfile: join(tmpdir(), `servora-crypto-kms-${Date.now()}.json`),
    seedSecret: 'crypto-service-test-secret',
  }));
});

describe('CryptoService — field encryption (§A1)', () => {
  it('round-trips and tags ciphertext with the keyId', () => {
    const ct = crypto.encrypt('27AAACA1234A1Z5');
    expect(ct).not.toContain('27AAACA1234A1Z5');
    expect(ct.startsWith('f1.v1.')).toBe(true); // scheme + current keyId
    expect(crypto.decrypt(ct)).toBe('27AAACA1234A1Z5');
  });

  it('uses a random IV (same plaintext → different ciphertext)', () => {
    expect(crypto.encrypt('a@b.com')).not.toBe(crypto.encrypt('a@b.com'));
  });

  it('blind index is deterministic and case/space-normalized', () => {
    expect(crypto.blindIndex('Ops@Acme.example ')).toBe(crypto.blindIndex('ops@acme.example'));
    expect(crypto.blindIndex('a@b.com')).not.toBe(crypto.blindIndex('c@d.com'));
  });

  it('decryptMaybe passes through legacy plaintext', () => {
    expect(crypto.decryptMaybe('plain-legacy')).toBe('plain-legacy');
    expect(crypto.decryptMaybe(null)).toBeNull();
  });

  it('supports key rotation: old ciphertext still decrypts, new uses new key', async () => {
    const old = crypto.encrypt('secret-v1');
    expect(crypto.needsRotation(old)).toBe(false);
    const newId = await kms.rotate();
    expect(newId).toBe('v2');
    // Old data (keyId v1) still decryptable; flagged as needing rotation.
    expect(crypto.decrypt(old)).toBe('secret-v1');
    expect(crypto.needsRotation(old)).toBe(true);
    // New writes use the new key.
    expect(crypto.encrypt('secret-v2').startsWith('f1.v2.')).toBe(true);
  });
});
