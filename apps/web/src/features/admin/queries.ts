import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { clientConfig } from '@/lib/client-config';
import {
  mockAdminServices,
  mockActiveEngineers,
  mockCandidates,
  mockJobs,
  mockPendingEngineers,
  mockUnassigned,
  type AdminService,
  type ActiveEngineer,
  type Candidate,
  type DispatchJob,
  type Job,
  type PendingEngineer,
} from '@/lib/admin-data';

const mockOr = <T>(mock: T, path: string) =>
  clientConfig.useMocks ? Promise.resolve(mock) : api.get<T>(path);

export function useJobs() {
  return useQuery({ queryKey: ['admin', 'jobs'], queryFn: () => mockOr<Job[]>(mockJobs, '/bookings/admin/all') });
}

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => mockOr<AdminService[]>(mockAdminServices, '/catalog/admin/services'),
  });
}

export function useEngineers() {
  return useQuery({
    queryKey: ['admin', 'engineers'],
    queryFn: async () =>
      clientConfig.useMocks
        ? { pending: mockPendingEngineers, active: mockActiveEngineers }
        : {
            pending: await api.get<PendingEngineer[]>('/engineers/pending'),
            active: await api.get<ActiveEngineer[]>('/engineers'),
          },
  });
}

export function useDispatchQueue() {
  return useQuery({
    queryKey: ['admin', 'dispatch'],
    queryFn: () => mockOr<DispatchJob[]>(mockUnassigned, '/dispatch/unassigned'),
  });
}

export function candidatesFor(jobId: string): Candidate[] {
  return mockCandidates[jobId] ?? [];
}
