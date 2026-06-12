import { createHash, createHmac, randomUUID } from 'node:crypto';

/**
 * Per-request anti-replay signature (SECURITY.md A3), computed SERVER-SIDE in
 * the BFF so the access token (the HMAC key) never reaches the browser.
 * Mirrors the backend AntiReplayGuard:
 *   HMAC-SHA256( method \n path \n sha256(body) \n timestamp \n nonce )
 */
export function signHeaders(params: {
  method: string;
  path: string; // full path incl. /api/v1 + query (matches server originalUrl)
  body: string;
  accessToken: string;
}): Record<string, string> {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const bodyHash = createHash('sha256').update(params.body).digest('hex');
  const base = [params.method, params.path, bodyHash, timestamp, nonce].join('\n');
  const signature = createHmac('sha256', params.accessToken).update(base).digest('hex');
  return { 'x-timestamp': timestamp, 'x-nonce': nonce, 'x-signature': signature };
}
