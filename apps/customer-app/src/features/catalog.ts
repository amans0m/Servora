import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../services/api';
import { config } from '../services/config';
import { categories, coupons, services } from '../services/mock/data';
import type { Coupon, Service } from '../types';

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250));

/** Backend catalog row → mobile Service (reviews/add-ons hydrated on detail). */
function mapService(s: any): Service {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    price: Number(s.basePrice),
    rating: s.rating ?? 0,
    engineersNearby: s.engineersNearby ?? 0,
    summary: s.description ?? '',
    included: s.included ?? [],
    addons: (s.addons ?? []).map((a: any) => ({ id: a.id, name: a.name, price: Number(a.price) })),
    reviews: [],
  };
}

async function fetchServices(categoryId?: string): Promise<Service[]> {
  // The single mock→real switch (services/, §9.4). Default: mocks.
  if (config.useMocks) {
    return delay(categoryId ? services.filter((s) => s.category === categoryId) : services);
  }
  const rows = await apiClient.get<any[]>('/catalog/services', {
    auth: false,
    query: { category: categoryId },
  });
  return rows.map(mapService);
}

export function useCategories() {
  return categories;
}

export function useServices(categoryId?: string) {
  return useQuery({ queryKey: ['services', categoryId ?? 'all'], queryFn: () => fetchServices(categoryId) });
}

export function useService(serviceId: string) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const all = await fetchServices();
      return all.find((s) => s.id === serviceId) ?? (services.find((s) => s.id === serviceId) as Service);
    },
  });
}

export function usePopularServices() {
  return useQuery({ queryKey: ['popular'], queryFn: async () => (await fetchServices()).slice(0, 4) });
}

export function useCoupons(): Coupon[] {
  return coupons;
}

export function findCoupon(code: string): Coupon | undefined {
  return coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
}
