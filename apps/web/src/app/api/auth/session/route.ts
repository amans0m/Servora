import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getAccessToken } from '@/lib/session';

/** Lightweight session check for the client (no tokens returned). */
export async function GET() {
  const authenticated = Boolean(getAccessToken());
  const role = cookies().get('servora_role')?.value || null;
  return NextResponse.json({ authenticated, role });
}
