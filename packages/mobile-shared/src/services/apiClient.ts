import { useSessionStore } from '../store/session.store';
import { signRequest } from './signing';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const MUTATING = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  correlationId?: string;
}

export interface RequestOptions {
  body?: unknown;
  auth?: boolean; // attach bearer (default true)
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

export interface ApiClient {
  request<T>(method: HttpMethod, path: string, opts?: RequestOptions): Promise<T>;
  get<T>(path: string, opts?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  del<T>(path: string, opts?: RequestOptions): Promise<T>;
}

/**
 * Typed API client (SECURITY.md B2/B3): HTTPS only, bearer auth, per-request
 * anti-replay signing on mutations, and silent one-shot refresh with rotating
 * refresh tokens — clean logout on refresh failure.
 */
export function createApiClient(config: {
  baseUrl: string; // https://… (no trailing slash); paths begin with /api/v1
  apiPrefix?: string; // default '/api/v1'
}): ApiClient {
  const prefix = config.apiPrefix ?? '/api/v1';
  if (!config.baseUrl.startsWith('https://') && !__DEV__) {
    throw new Error('API base URL must be https:// in production');
  }

  function buildUrl(path: string, query?: RequestOptions['query']): { full: string; pathOnly: string } {
    const pathOnly = `${prefix}${path}`;
    const qs = query
      ? '?' +
        Object.entries(query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return { full: `${config.baseUrl}${pathOnly}${qs}`, pathOnly: `${pathOnly}${qs}` };
  }

  async function refresh(): Promise<boolean> {
    const { refreshToken, setSession, clear } = useSessionStore.getState();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${config.baseUrl}${prefix}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clear();
        return false;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      await clear();
      return false;
    }
  }

  async function doFetch<T>(
    method: HttpMethod,
    path: string,
    opts: RequestOptions,
    retried: boolean,
  ): Promise<T> {
    const { full, pathOnly } = buildUrl(path, opts.query);
    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
    const headers: Record<string, string> = { 'content-type': 'application/json', ...opts.headers };

    const { accessToken } = useSessionStore.getState();
    const useAuth = opts.auth !== false;
    if (useAuth && accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
      // Sign mutating requests (anti-replay) with the access token as key.
      if (MUTATING.has(method)) {
        Object.assign(headers, signRequest({ method, path: pathOnly, body: bodyStr, accessToken }));
      }
    }

    const res = await fetch(full, {
      method,
      headers,
      body: opts.body !== undefined ? bodyStr : undefined,
    });

    // Silent refresh once on 401, then retry.
    if (res.status === 401 && useAuth && !retried) {
      if (await refresh()) return doFetch<T>(method, path, opts, true);
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) throw data as ApiError;
    return data as T;
  }

  const request = <T,>(method: HttpMethod, path: string, opts: RequestOptions = {}) =>
    doFetch<T>(method, path, opts, false);

  return {
    request,
    get: (p, o) => request('GET', p, o),
    post: (p, body, o) => request('POST', p, { ...o, body }),
    patch: (p, body, o) => request('PATCH', p, { ...o, body }),
    del: (p, o) => request('DELETE', p, o),
  };
}
