import { NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { AT_COOKIE, RT_COOKIE, cookieOptions, decodeRole } from '@/lib/session';

/**
 * Login BFF: exchanges credentials with the API, then stores tokens in
 * httpOnly cookies (SECURITY.md B1) — they never reach client JS. A readable
 * (non-secret) `servora_role` cookie is set for UI gating only.
 */
export async function POST(req: Request) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  let accessToken: string;
  let refreshToken: string;
  let role: string | null;

  if (config.useMocks) {
    accessToken = 'mock.access';
    refreshToken = 'mock.refresh';
    role = email.startsWith('super') ? 'super_admin' : 'admin';
  } else {
    const res = await fetch(`${config.apiBaseUrl}${config.apiPrefix}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      // Uniform error — no enumeration (mirrors backend, B-A6).
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    role = decodeRole(accessToken);
  }

  const out = NextResponse.json({ ok: true, role });
  out.cookies.set(AT_COOKIE, accessToken, cookieOptions);
  out.cookies.set(RT_COOKIE, refreshToken, cookieOptions);
  out.cookies.set('servora_role', role ?? '', { ...cookieOptions, httpOnly: false });
  return out;
}
