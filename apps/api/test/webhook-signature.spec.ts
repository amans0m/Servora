import { createHmac } from 'node:crypto';

import { HttpRazorpayClient } from '../src/modules/payments/razorpay.client';

const SECRET = 'whsec_test_123';

function client(secret?: string) {
  const integrations = {
    getConfig: async () => ({ enabled: true, values: { keySecret: secret } }),
  } as never;
  return new HttpRazorpayClient(integrations);
}

describe('Razorpay webhook signature verification (§A7)', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: {} });

  it('accepts a correctly-signed webhook', async () => {
    const sig = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(await client(SECRET).verifyWebhookSignature(body, sig)).toBe(true);
  });

  it('rejects a forged signature', async () => {
    expect(await client(SECRET).verifyWebhookSignature(body, 'deadbeef')).toBe(false);
  });

  it('rejects when the body is tampered after signing', async () => {
    const sig = createHmac('sha256', SECRET).update(body).digest('hex');
    const tampered = JSON.stringify({ event: 'payment.captured', payload: { evil: 1 } });
    expect(await client(SECRET).verifyWebhookSignature(tampered, sig)).toBe(false);
  });
});
