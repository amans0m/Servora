import { config } from './config';
import { getAccessToken } from './session';

/**
 * Read-only server fetch for Server Components (public or authed GETs).
 * Authenticated mutations + silent refresh go through the BFF route handler
 * (app/api/bff) so cookies can be rotated on the response.
 */
export async function serverGet<T>(path: string, opts: { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth) {
    const at = getAccessToken();
    if (at) headers.authorization = `Bearer ${at}`;
  }
  const res = await fetch(`${config.apiBaseUrl}${config.apiPrefix}${path}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}
