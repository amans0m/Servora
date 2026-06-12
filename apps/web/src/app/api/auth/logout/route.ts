import { NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { AT_COOKIE, RT_COOKIE, getRefreshToken } from '@/lib/session';

/** Clear the session cookies and revoke the refresh family server-side. */
export async function POST() {
  const rt = getRefreshToken();
  if (!config.useMocks && rt) {
    await fetch(`${config.apiBaseUrl}${config.apiPrefix}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    }).catch(() => {});
  }
  const out = NextResponse.json({ ok: true });
  for (const name of [AT_COOKIE, RT_COOKIE, 'servora_role']) {
    out.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return out;
}
