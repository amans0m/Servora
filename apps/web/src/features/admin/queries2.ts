import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { clientConfig } from '@/lib/client-config';
import {
  mockCoupons,
  mockCustomers,
  mockDisputes,
  mockIncentives,
  mockPayments,
  type Coupon,
  type Customer,
  type Dispute,
} from '@/lib/admin-data2';

const mockOr = <T>(mock: T, path: string) =>
  clientConfig.useMocks ? Promise.resolve(mock) : api.get<T>(path);

export function useCustomers() {
  return useQuery({ queryKey: ['admin', 'customers'], queryFn: () => mockOr<Customer[]>(mockCustomers, '/admin/customers') });
}
export function usePayments() {
  return useQuery({ queryKey: ['admin', 'payments'], queryFn: () => mockOr(mockPayments, '/admin/transactions') });
}
export function useCoupons() {
  return useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => mockOr<Coupon[]>(mockCoupons, '/coupons') });
}
export function useIncentives() {
  return useQuery({ queryKey: ['admin', 'incentives'], queryFn: () => mockOr(mockIncentives, '/incentives') });
}
export function useDisputes() {
  return useQuery({ queryKey: ['admin', 'disputes'], queryFn: () => mockOr<Dispute[]>(mockDisputes, '/disputes') });
}
