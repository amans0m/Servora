import { maskRef } from '../src/modules/kyc/entities/kyc-record';
import { MockSurepassClient } from '../src/modules/kyc/surepass.client';

describe('MockSurepassClient (local stub)', () => {
  const client = new MockSurepassClient();

  it('passes a valid GSTIN and fills the legal name', async () => {
    const r = await client.verifyGstin('27AAACA1234A1Z5');
    expect(r.verified).toBe(true);
    expect(r.active).toBe(true);
    expect(r.legalName).toBeTruthy();
  });

  it('rejects a malformed GSTIN', async () => {
    const r = await client.verifyGstin('not-a-gstin');
    expect(r.verified).toBe(false);
  });

  it('runs the Aadhaar OTP round-trip (123456 in mock mode)', async () => {
    const init = await client.aadhaarGenerateOtp('123456789012');
    expect(init.otpSent).toBe(true);
    expect(init.clientId).toContain('mock_');
    expect((await client.aadhaarSubmitOtp(init.clientId, '123456')).verified).toBe(true);
    expect((await client.aadhaarSubmitOtp(init.clientId, '000000')).verified).toBe(false);
  });

  it('verifies PAN and bank on valid input', async () => {
    expect((await client.verifyPan('ABCDE1234F')).verified).toBe(true);
    expect((await client.verifyBank('000123456789', 'HDFC0001234')).verified).toBe(true);
    expect((await client.verifyBank('1', 'BADIFSC')).verified).toBe(false);
  });
});

describe('maskRef (PII masking, §12)', () => {
  it('keeps only the last 4 characters', () => {
    expect(maskRef('123456789012')).toBe('XXXXXXXX9012');
    expect(maskRef('ABCDE1234F')).toBe('XXXXXX234F');
  });
});
