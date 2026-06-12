import * as Crypto from 'expo-crypto';
import { sha256 } from 'js-sha256';

export interface SignatureHeaders {
  'x-timestamp': string;
  'x-nonce': string;
  'x-signature': string;
}

/**
 * Per-request anti-replay signature (SECURITY.md A3/B3). Computes
 *   HMAC-SHA256( method \n path \n sha256(body) \n timestamp \n nonce )
 * keyed by the access token — matching the backend AntiReplayGuard. The token
 * is a per-session secret the client already holds (never in the bundle).
 */
export function signRequest(params: {
  method: string;
  path: string; // full path incl. /api prefix + query, must match server originalUrl
  body: string; // raw JSON body, '' for none
  accessToken: string;
}): SignatureHeaders {
  const timestamp = String(Date.now());
  const nonce = Crypto.randomUUID();
  const bodyHash = sha256(params.body);
  const base = [params.method, params.path, bodyHash, timestamp, nonce].join('\n');
  const signature = sha256.hmac(params.accessToken, base);
  return { 'x-timestamp': timestamp, 'x-nonce': nonce, 'x-signature': signature };
}
