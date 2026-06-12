import { decryptSecret, encryptSecret } from '../src/config/crypto.util';

describe('integration secret crypto (AES-256-GCM)', () => {
  const key = 'a-test-encryption-key-at-least-16';

  it('round-trips a plaintext secret', () => {
    const plaintext = JSON.stringify({ token: 'sk_live_abc123' });
    const ciphertext = encryptSecret(plaintext, key);
    expect(ciphertext).not.toContain('sk_live_abc123');
    expect(decryptSecret(ciphertext, key)).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same', key);
    const b = encryptSecret('same', key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe('same');
    expect(decryptSecret(b, key)).toBe('same');
  });

  it('fails to decrypt with the wrong key', () => {
    const ciphertext = encryptSecret('secret', key);
    expect(() => decryptSecret(ciphertext, 'a-different-key-16chars!!')).toThrow();
  });
});
