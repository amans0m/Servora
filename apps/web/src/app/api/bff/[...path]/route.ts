import { NextResponse } from 'next/server';

import { config } from '@/lib/config';
import {
  AT_COOKIE,
  RT_COOKIE,
  cookieOptions,
  getAccessToken,
  getRefreshToken,
} from '@/lib/session';
import { signHeaders } from '@/lib/signing';

/**
 * Authenticated BFF proxy (SECURITY.md B1/B3). The browser calls
 * /api/bff/<path>; this handler attaches the bearer token + A3 signature
 * SERVER-SIDE from httpOnly cookies, forwards to the API, and on 401 does a
 * silent one-shot refresh (rotating token) — rotating the cookies on the way
 * out. Tokens never touch client JS.
 */
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function handle(req: Request, ctx: { params: { path: string[] } }, method: Method) {
  const url = new URL(req.url);
  const path = `${config.apiPrefix}/${ctx.params.path.join('/')}${url.search}`;
  const body = method === 'GET' || method === 'DELETE' ? '' : await req.text();

  let accessToken = getAccessToken();
  let rotated: { accessToken: string; refreshToken: string } | null = null;

  let res = await forward(method, path, body, accessToken);

  if (res.status === 401) {
    rotated = await refresh(getRefreshToken());
    if (rotated) {
      accessToken = rotated.accessToken;
      res = await forward(method, path, body, accessToken);
    }
  }

  const text = await res.text();
  const out = new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
  if (rotated) {
    out.cookies.set(AT_COOKIE, rotated.accessToken, cookieOptions);
    out.cookies.set(RT_COOKIE, rotated.refreshToken, cookieOptions);
  }
  if (res.status === 401) {
    // Refresh failed → clear the session (clean logout, B3).
    for (const name of [AT_COOKIE, RT_COOKIE, 'servora_role']) {
      out.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
  }
  return out;
}

async function forward(method: Method, path: string, body: string, accessToken: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
    if (method !== 'GET') Object.assign(headers, signHeaders({ method, path, body, accessToken }));
  }
  return fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body || undefined,
    cache: 'no-store',
  });
}

async function refresh(refreshToken: string | null) {
  if (!refreshToken) return null;
  const res = await fetch(`${config.apiBaseUrl}${config.apiPrefix}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { accessToken: string; refreshToken: string };
}

export const GET = (req: Request, ctx: { params: { path: string[] } }) => handle(req, ctx, 'GET');
export const POST = (req: Request, ctx: { params: { path: string[] } }) => handle(req, ctx, 'POST');
export const PATCH = (req: Request, ctx: { params: { path: string[] } }) => handle(req, ctx, 'PATCH');
export const PUT = (req: Request, ctx: { params: { path: string[] } }) => handle(req, ctx, 'PUT');
export const DELETE = (req: Request, ctx: { params: { path: string[] } }) => handle(req, ctx, 'DELETE');
