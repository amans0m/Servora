import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { clientConfig } from '@/lib/client-config';
import { mockDashboard, type DashboardData } from '@/lib/admin-mock';

/** Dashboard data — mock until the backend switch (NEXT_PUBLIC_USE_MOCKS) is off. */
export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      if (clientConfig.useMocks) return mockDashboard;
      return api.get<DashboardData>('/admin/dashboard');
    },
  });
}
