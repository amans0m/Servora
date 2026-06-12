import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAccessToken } from '@/lib/session';
import { AdminShell } from '@/components/admin/admin-shell';

/**
 * Admin is auth-gated (SECURITY.md). The session is read from the httpOnly
 * cookie server-side; unauthenticated requests are redirected to /login.
 * Role drives the sidebar (Integrations is super-admin only — A4).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!getAccessToken()) redirect('/login');
  const role = cookies().get('servora_role')?.value || 'admin';
  return <AdminShell role={role}>{children}</AdminShell>;
}
