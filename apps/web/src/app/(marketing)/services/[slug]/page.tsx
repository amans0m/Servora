import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { getService } from '@/lib/catalog';
import { formatINR } from '@/lib/utils';

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

// Validate the URL param before any lookup (SECURITY.md B4).
function safeSlug(slug: string): string | null {
  return SLUG_RE.test(slug) ? slug : null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = safeSlug(params.slug);
  const service = slug ? await getService(slug) : null;
  if (!service) return { title: 'Service not found — Servora' };
  return {
    title: `${service.name} — Servora`,
    description: service.summary,
    openGraph: { title: service.name, description: service.summary },
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const slug = safeSlug(params.slug);
  const service = slug ? await getService(slug) : null;
  if (!service) notFound();

  return (
    <section className="bg-bg">
      <Container className="py-12">
        <Link href="/services" className="text-sm font-medium text-primary">← Back to catalog</Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Main content */}
          <div className="flex flex-col gap-6">
            <div>
              <Badge tone="accent" className="mb-3">{service.category}</Badge>
              <h1 className="font-display text-3xl font-extrabold text-ink">{service.name}</h1>
              <p className="mt-2 max-w-2xl text-muted">{service.summary}</p>
            </div>

            <Card>
              <CardTitle className="text-base">What’s included</CardTitle>
              <ul className="mt-3 space-y-2">
                {service.included.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-ink">
                    <span className="text-success">✓</span> {i}
                  </li>
                ))}
              </ul>
            </Card>

            {service.addons.length > 0 ? (
              <Card>
                <CardTitle className="text-base">Add-ons</CardTitle>
                <ul className="mt-3 space-y-2">
                  {service.addons.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-ink">
                      <span>{a.name}</span>
                      <span className="text-muted">+{formatINR(a.price)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>

          {/* Sticky buy box */}
          <Card className="lg:sticky lg:top-20">
            <div className="text-sm text-muted">Starting price</div>
            <div className="font-display text-3xl font-extrabold text-ink">{formatINR(service.price)}</div>
            <div className="mt-1 text-sm text-muted">
              {service.rating}★ · {service.engineersNearby} engineers available nearby
            </div>
            <div className="mt-1 text-sm text-success">Typical dispatch ~15 min</div>

            <div className="mt-5 flex flex-col gap-2">
              {/* Book / quote open the Customer App. */}
              <Button asChild><Link href="/services">Book this service</Link></Button>
              <Button asChild variant="ghost"><Link href="/services">Request custom quote</Link></Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted">
              🔒 No payment now — you pay only when the job is completed.
            </p>
          </Card>
        </div>
      </Container>
    </section>
  );
}
