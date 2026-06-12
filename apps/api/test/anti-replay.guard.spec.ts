import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, createHmac } from 'node:crypto';

import { AntiReplayGuard } from '../src/common/guards/anti-replay.guard';

const TOKEN = 'access-token-abc';

function sign(method: string, url: string, body: string, ts: string, nonce: string) {
  const base = [method, url, createHash('sha256').update(body).digest('hex'), ts, nonce].join('\n');
  return createHmac('sha256', TOKEN).update(base).digest('hex');
}

function makeGuard(redisSet: jest.Mock) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false as never); // not public, not skipped
  const redis = { set: redisSet } as never;
  return new AntiReplayGuard(reflector, redis);
}

function ctx(headers: Record<string, string>, body = '') {
  const req = {
    method: 'POST',
    originalUrl: '/api/v1/bookings',
    headers: { authorization: `Bearer ${TOKEN}`, ...headers },
    rawBody: Buffer.from(body),
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe('AntiReplayGuard (§A3)', () => {
  const url = '/api/v1/bookings';
  const body = '{"x":1}';

  it('rejects a request with no signature headers', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue('OK'));
    await expect(guard.canActivate(ctx({}, body))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a correctly-signed, fresh request', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue('OK'));
    const ts = String(Date.now());
    const nonce = 'nonce-1';
    const sig = sign('POST', url, body, ts, nonce);
    const headers = { 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig };
    await expect(guard.canActivate(ctx(headers, body))).resolves.toBe(true);
  });

  it('rejects a tampered body (signature mismatch)', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue('OK'));
    const ts = String(Date.now());
    const sig = sign('POST', url, body, ts, 'n2'); // signed the original body
    const headers = { 'x-timestamp': ts, 'x-nonce': 'n2', 'x-signature': sig };
    await expect(
      guard.canActivate(ctx(headers, '{"x":2}')), // different body
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a stale timestamp', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue('OK'));
    const ts = String(Date.now() - 10 * 60 * 1000); // 10 min old
    const sig = sign('POST', url, body, ts, 'n3');
    const headers = { 'x-timestamp': ts, 'x-nonce': 'n3', 'x-signature': sig };
    await expect(guard.canActivate(ctx(headers, body))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a replayed nonce (Redis SET NX returns null)', async () => {
    const guard = makeGuard(jest.fn().mockResolvedValue(null)); // nonce already stored
    const ts = String(Date.now());
    const sig = sign('POST', url, body, ts, 'n4');
    const headers = { 'x-timestamp': ts, 'x-nonce': 'n4', 'x-signature': sig };
    await expect(guard.canActivate(ctx(headers, body))).rejects.toThrow(/replay/i);
  });
});
