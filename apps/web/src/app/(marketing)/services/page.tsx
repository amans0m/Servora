import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardMuted, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { getServices } from '@/lib/catalog';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'IT services catalog — Servora',
  description:
    'Browse Servora’s catalog of on-demand IT services: network, cloud, security, server administration, helpdesk and Wi-Fi — with transparent pricing.',
};

export default async function ServicesCatalogPage() {
  const services = await getServices();

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14">
          <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Services catalog</h1>
          <p className="mt-2 max-w-xl text-muted">
            Pick a service to see what’s included and book a verified engineer. Pay only on completion.
          </p>
        </Container>
      </section>

      <section className="bg-bg">
        <Container className="py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`}>
                <Card className="flex h-full flex-col transition-shadow hover:shadow-card">
                  <Badge tone="accent" className="mb-3 w-fit">{s.category}</Badge>
                  <CardTitle>{s.name}</CardTitle>
                  <CardMuted className="mt-1 line-clamp-2 flex-1">{s.summary}</CardMuted>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-ink">From {formatINR(s.price)}</span>
                    <span className="text-sm text-muted">{s.rating}★ · {s.engineersNearby} nearby</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
