import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { IntegrationsConfigService } from '../../config/integrations-config.service';

/**
 * Single wrapper around Razorpay (Tech-Stack §6). Pay-on-completion:
 * an order is created with manual capture at booking; the amount is captured
 * only at completion. Keys resolve via the integrations-config service
 * (DB-first, env-fallback). With no keys it auto-mocks so the flow runs
 * locally; swap for a fake in tests via RAZORPAY_CLIENT.
 */
export const RAZORPAY_CLIENT = Symbol('RAZORPAY_CLIENT');

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayOrder {
  orderId: string;
  mock: boolean;
}
export interface CaptureResult {
  captured: boolean;
  paymentId: string;
}
export interface RefundResult {
  refundId: string;
  status: string;
}

export interface RazorpayClient {
  createOrder(amountRupees: number, receipt: string): Promise<RazorpayOrder>;
  capture(
    paymentId: string | undefined,
    orderId: string,
    amountRupees: number,
  ): Promise<CaptureResult>;
  refund(paymentId: string, amountRupees: number): Promise<RefundResult>;
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
}

@Injectable()
export class HttpRazorpayClient implements RazorpayClient {
  private readonly logger = new Logger(HttpRazorpayClient.name);

  constructor(private readonly integrations: IntegrationsConfigService) {}

  private async creds() {
    const { values } = await this.integrations.getConfig('razorpay');
    return { keyId: values.keyId, keySecret: values.keySecret };
  }

  private authHeader(keyId: string, keySecret: string): string {
    return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }

  async createOrder(amountRupees: number, receipt: string): Promise<RazorpayOrder> {
    const { keyId, keySecret } = await this.creds();
    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay keys unset — mock order');
      return { orderId: `order_mock_${receipt}`, mock: true };
    }
    const res = await fetch(`${RAZORPAY_BASE}/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: this.authHeader(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100), // paise
        currency: 'INR',
        receipt,
        payment_capture: 0, // manual capture — authorize now, capture at completion
      }),
    });
    if (!res.ok) throw new Error(`Razorpay createOrder failed (${res.status})`);
    const data = (await res.json()) as { id: string };
    return { orderId: data.id, mock: false };
  }

  async capture(
    paymentId: string | undefined,
    orderId: string,
    amountRupees: number,
  ): Promise<CaptureResult> {
    const { keyId, keySecret } = await this.creds();
    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay keys unset — mock capture');
      return { captured: true, paymentId: paymentId ?? `pay_mock_${orderId}` };
    }
    if (!paymentId) {
      throw new Error('A Razorpay payment id is required to capture');
    }
    const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: this.authHeader(keyId, keySecret),
      },
      body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: 'INR' }),
    });
    if (!res.ok) throw new Error(`Razorpay capture failed (${res.status})`);
    const data = (await res.json()) as { id: string; status: string };
    return { captured: data.status === 'captured', paymentId: data.id };
  }

  async refund(paymentId: string, amountRupees: number): Promise<RefundResult> {
    const { keyId, keySecret } = await this.creds();
    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay keys unset — mock refund');
      return { refundId: `rfnd_mock_${paymentId}`, status: 'processed' };
    }
    const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: this.authHeader(keyId, keySecret),
      },
      body: JSON.stringify({ amount: Math.round(amountRupees * 100) }),
    });
    if (!res.ok) throw new Error(`Razorpay refund failed (${res.status})`);
    const data = (await res.json()) as { id: string; status: string };
    return { refundId: data.id, status: data.status };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    const { values } = await this.integrations.getConfig('razorpay');
    const secret = values.webhookSecret ?? values.keySecret;
    if (!secret) {
      this.logger.warn('No Razorpay webhook secret — accepting webhook in mock mode');
      return true;
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

/** Deterministic fake for tests. */
export class MockRazorpayClient implements RazorpayClient {
  async createOrder(_amount: number, receipt: string): Promise<RazorpayOrder> {
    return { orderId: `order_mock_${receipt}_${randomUUID().slice(0, 8)}`, mock: true };
  }
  async capture(
    paymentId: string | undefined,
    orderId: string,
  ): Promise<CaptureResult> {
    return { captured: true, paymentId: paymentId ?? `pay_mock_${orderId}` };
  }
  async refund(paymentId: string): Promise<RefundResult> {
    return { refundId: `rfnd_mock_${paymentId}`, status: 'processed' };
  }
  async verifyWebhookSignature(): Promise<boolean> {
    return true;
  }
}
