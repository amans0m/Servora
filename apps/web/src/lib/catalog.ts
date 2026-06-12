import { config } from './config';
import { mockServices, type Service } from './mock';
import { serverGet } from './server-api';

function mapService(s: any): Service {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    price: Number(s.basePrice ?? s.price),
    rating: s.rating ?? 0,
    engineersNearby: s.engineersNearby ?? 0,
    summary: s.description ?? s.summary ?? '',
    included: s.included ?? [],
    addons: (s.addons ?? []).map((a: any) => ({ id: a.id, name: a.name, price: Number(a.price) })),
  };
}

/** The single mock→real switch for the public catalog. */
export async function getServices(): Promise<Service[]> {
  if (config.useMocks) return mockServices;
  const rows = await serverGet<any[]>('/catalog/services');
  return rows.map(mapService);
}

export async function getService(slug: string): Promise<Service | null> {
  const all = await getServices();
  return all.find((s) => s.slug === slug) ?? null;
}
