import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { IntegrationsClient } from '@/components/admin/integrations-client';

/**
 * Integrations (API keys) is SUPER-ADMIN only (§A4). Gated server-side from the
 * role cookie — a normal admin is redirected away even if they reach the URL.
 */
export default function IntegrationsPage() {
  const role = cookies().get('servora_role')?.value;
  if (role !== 'super_admin') redirect('/admin/dashboard');
  return <IntegrationsClient />;
}
