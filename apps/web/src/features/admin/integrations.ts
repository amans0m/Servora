import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { clientConfig } from '@/lib/client-config';
import { mockIntegrations, type Integration } from '@/lib/integrations-mock';

export function useIntegrations() {
  return useQuery<Integration[]>({
    queryKey: ['admin', 'integrations'],
    queryFn: () => (clientConfig.useMocks ? Promise.resolve(mockIntegrations) : api.get('/admin/integrations')),
  });
}

/** Save (encrypted server-side) — only non-empty fields; values never echoed back. */
export async function saveIntegration(provider: string, values: Record<string, string>, enabled?: boolean) {
  if (clientConfig.useMocks) return { saved: true };
  return api.put(`/admin/integrations/${provider}`, { values, enabled });
}
export async function testIntegration(provider: string) {
  if (clientConfig.useMocks) return { ok: true, status: 'connected' };
  return api.post(`/admin/integrations/${provider}/test`);
}
export async function toggleIntegration(provider: string, enabled: boolean) {
  if (clientConfig.useMocks) return { provider, enabled };
  return api.post(`/admin/integrations/${provider}/toggle`, { enabled });
}
