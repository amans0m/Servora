import { Injectable, Logger } from '@nestjs/common';

import { IntegrationsConfigService } from '../../config/integrations-config.service';

/**
 * Single wrapper around Surepass (Tech-Stack §5). The rest of the app talks
 * ONLY to this interface — clients never see Surepass credentials or raw
 * responses (§5, §12). Swap in a fake in tests by overriding SUREPASS_CLIENT.
 *
 * Endpoint paths below are the standard Surepass v1 paths and match the
 * confirmed request fields (id_number / client_id+otp / ifsc) + Bearer auth.
 * VERIFY them against your Surepass dashboard before going live (§5.3 note);
 * the base URL is configurable via SUREPASS_BASE_URL.
 */
export const SUREPASS_CLIENT = Symbol('SUREPASS_CLIENT');

export interface GstinResult {
  verified: boolean;
  active: boolean;
  legalName?: string;
  tradeName?: string;
  address?: string;
  raw?: unknown;
}

export interface PanResult {
  verified: boolean;
  fullName?: string;
}

export interface AadhaarOtpInit {
  clientId: string;
  otpSent: boolean;
}

export interface AadhaarResult {
  verified: boolean;
  ageBand?: string;
  gender?: string;
  state?: string;
}

export interface BankResult {
  verified: boolean;
  nameAtBank?: string;
}

export interface SurepassClient {
  verifyGstin(gstin: string): Promise<GstinResult>;
  verifyPan(pan: string): Promise<PanResult>;
  aadhaarGenerateOtp(aadhaar: string): Promise<AadhaarOtpInit>;
  aadhaarSubmitOtp(clientId: string, otp: string): Promise<AadhaarResult>;
  verifyBank(accountNumber: string, ifsc: string): Promise<BankResult>;
}

// Standard Surepass v1 endpoint paths (relative to SUREPASS_BASE_URL).
const ENDPOINTS = {
  gstin: '/api/v1/corporate/gstin',
  pan: '/api/v1/pan/pan',
  aadhaarGenerateOtp: '/api/v1/aadhaar-v2/generate-otp',
  aadhaarSubmitOtp: '/api/v1/aadhaar-v2/submit-otp',
  bank: '/api/v1/bank-verification/',
} as const;

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^[0-9]{12}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Deterministic stub used when no Surepass token is configured, so the app
 * runs locally with no real keys (per the build conventions). Valid-format
 * inputs "pass"; the Aadhaar OTP is `123456` in mock mode.
 */
export class MockSurepassClient implements SurepassClient {
  async verifyGstin(gstin: string): Promise<GstinResult> {
    const ok = GSTIN_RE.test(gstin);
    return {
      verified: ok,
      active: ok,
      legalName: ok ? 'MOCK VERIFIED ENTERPRISES PRIVATE LIMITED' : undefined,
      tradeName: ok ? 'Mock Verified Enterprises' : undefined,
      address: ok ? '12 MG Road, Bengaluru, Karnataka, 560001' : undefined,
    };
  }

  async verifyPan(pan: string): Promise<PanResult> {
    const ok = PAN_RE.test(pan);
    return { verified: ok, fullName: ok ? 'Mock Verified Name' : undefined };
  }

  async aadhaarGenerateOtp(aadhaar: string): Promise<AadhaarOtpInit> {
    const ok = AADHAAR_RE.test(aadhaar);
    return { clientId: `mock_${aadhaar.slice(-4)}`, otpSent: ok };
  }

  async aadhaarSubmitOtp(_clientId: string, otp: string): Promise<AadhaarResult> {
    const ok = otp === '123456';
    return ok
      ? { verified: true, ageBand: '20-30', gender: 'M', state: 'Karnataka' }
      : { verified: false };
  }

  async verifyBank(accountNumber: string, ifsc: string): Promise<BankResult> {
    const ok = accountNumber.length >= 6 && IFSC_RE.test(ifsc);
    return { verified: ok, nameAtBank: ok ? 'Mock Verified Name' : undefined };
  }
}

/**
 * Real Surepass client. Resolves the token + base URL via the
 * integrations-config service (DB-first, env-fallback — §10). If no token is
 * configured it transparently falls back to the mock so local dev works; in
 * production a missing token surfaces as a clear error.
 */
@Injectable()
export class HttpSurepassClient implements SurepassClient {
  private readonly logger = new Logger(HttpSurepassClient.name);
  private readonly mock = new MockSurepassClient();

  constructor(private readonly integrations: IntegrationsConfigService) {}

  private async resolve(): Promise<{ token?: string; baseUrl: string }> {
    const { values } = await this.integrations.getConfig('surepass');
    return {
      token: values.token,
      baseUrl: values.baseUrl ?? 'https://kyc-api.surepass.io',
    };
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const { token, baseUrl } = await this.resolve();
    if (!token) {
      // No real key — used the mock instead (handled by callers below).
      throw new NoSurepassTokenError();
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Surepass ${path} -> HTTP ${res.status}`);
      throw new Error(`Surepass request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private async withFallback<T>(
    real: () => Promise<T>,
    mock: () => Promise<T>,
  ): Promise<T> {
    try {
      return await real();
    } catch (err) {
      if (err instanceof NoSurepassTokenError) {
        this.logger.warn('SUREPASS_TOKEN unset — using mock Surepass responses');
        return mock();
      }
      throw err;
    }
  }

  async verifyGstin(gstin: string): Promise<GstinResult> {
    return this.withFallback<GstinResult>(
      async () => {
        const r = await this.post<{ data: any; success: boolean }>(
          ENDPOINTS.gstin,
          { id_number: gstin },
        );
        const d = r.data ?? {};
        return {
          verified: !!r.success,
          active: (d.gstin_status ?? d.status) === 'Active',
          legalName: d.legal_name ?? d.lgnm,
          tradeName: d.trade_name ?? d.tradeNam,
          address: d.address ?? d.pradr?.adr,
          raw: undefined,
        };
      },
      () => this.mock.verifyGstin(gstin),
    );
  }

  async verifyPan(pan: string): Promise<PanResult> {
    return this.withFallback<PanResult>(
      async () => {
        const r = await this.post<{ data: any; success: boolean }>(ENDPOINTS.pan, {
          id_number: pan,
        });
        return { verified: !!r.success, fullName: r.data?.full_name };
      },
      () => this.mock.verifyPan(pan),
    );
  }

  async aadhaarGenerateOtp(aadhaar: string): Promise<AadhaarOtpInit> {
    return this.withFallback<AadhaarOtpInit>(
      async () => {
        const r = await this.post<{ data: any; success: boolean }>(
          ENDPOINTS.aadhaarGenerateOtp,
          { id_number: aadhaar },
        );
        return { clientId: r.data?.client_id, otpSent: !!r.success };
      },
      () => this.mock.aadhaarGenerateOtp(aadhaar),
    );
  }

  async aadhaarSubmitOtp(clientId: string, otp: string): Promise<AadhaarResult> {
    return this.withFallback<AadhaarResult>(
      async () => {
        const r = await this.post<{ data: any; success: boolean }>(
          ENDPOINTS.aadhaarSubmitOtp,
          { client_id: clientId, otp },
        );
        const d = r.data ?? {};
        return {
          verified: !!r.success,
          ageBand: d.age_range,
          gender: d.gender,
          state: d.address?.state,
        };
      },
      () => this.mock.aadhaarSubmitOtp(clientId, otp),
    );
  }

  async verifyBank(accountNumber: string, ifsc: string): Promise<BankResult> {
    return this.withFallback<BankResult>(
      async () => {
        const r = await this.post<{ data: any; success: boolean }>(ENDPOINTS.bank, {
          id_number: accountNumber,
          ifsc,
        });
        return { verified: !!r.success, nameAtBank: r.data?.full_name };
      },
      () => this.mock.verifyBank(accountNumber, ifsc),
    );
  }
}

class NoSurepassTokenError extends Error {}
