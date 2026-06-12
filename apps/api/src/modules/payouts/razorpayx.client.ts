import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { IntegrationsConfigService } from '../../config/integrations-config.service';

/**
 * Single wrapper around RazorpayX engineer payouts (Tech-Stack §6). Keys
 * resolve via the integrations-config service (DB-first, env-fallback). With
 * no keys it auto-mocks so the flow runs locally; swap for a fake in tests via
 * RAZORPAYX_CLIENT.
 */
export const RAZORPAYX_CLIENT = Symbol('RAZORPAYX_CLIENT');

const RAZORPAYX_BASE = 'https://api.razorpay.com/v1';

export interface PayoutResult {
  payoutId: string;
  status: 'processing' | 'processed' | 'failed';
  mock: boolean;
}

export interface RazorpayXClient {
  createPayout(
    amountRupees: number,
    reference: string,
    engineerRef: string,
  ): Promise<PayoutResult>;
}

@Injectable()
export class HttpRazorpayXClient implements RazorpayXClient {
  private readonly logger = new Logger(HttpRazorpayXClient.name);

  constructor(private readonly integrations: IntegrationsConfigService) {}

  async createPayout(
    amountRupees: number,
    reference: string,
    engineerRef: string,
  ): Promise<PayoutResult> {
    const { values } = await this.integrations.getConfig('razorpayx');
    const key = values.key;
    const secret = values.secret;
    if (!key || !secret) {
      this.logger.warn('RazorpayX keys unset — mock payout');
      return { payoutId: `pout_mock_${reference}`, status: 'processed', mock: true };
    }
    const res = await fetch(`${RAZORPAYX_BASE}/payouts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100),
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        reference_id: reference,
        notes: { engineer: engineerRef },
      }),
    });
    if (!res.ok) throw new Error(`RazorpayX payout failed (${res.status})`);
    const data = (await res.json()) as { id: string; status: string };
    return {
      payoutId: data.id,
      status: data.status === 'processed' ? 'processed' : 'processing',
      mock: false,
    };
  }
}

/** Deterministic fake for tests. */
export class MockRazorpayXClient implements RazorpayXClient {
  async createPayout(_amount: number, reference: string): Promise<PayoutResult> {
    return {
      payoutId: `pout_mock_${reference}_${randomUUID().slice(0, 8)}`,
      status: 'processed',
      mock: true,
    };
  }
}
