import { cookies } from 'next/headers';

/**
 * Session lives in httpOnly + Secure + SameSite=strict cookies (SECURITY.md
 * B1) — unreadable by client JS. Set/cleared only in BFF route handlers.
 */
export const AT_COOKIE = 'servora_at';
export const RT_COOKIE = 'servora_rt';

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export function getAccessToken(): string | null {
  return cookies().get(AT_COOKIE)?.value ?? null;
}

export function getRefreshToken(): string | null {
  return cookies().get(RT_COOKIE)?.value ?? null;
}

/** Decode a JWT payload (no verification — only to read role for UI gating). */
export function decodeRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return json.role ?? null;
  } catch {
    return null;
  }
}
