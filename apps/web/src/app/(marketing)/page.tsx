import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardMuted, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { getServices } from '@/lib/catalog';
import { formatINR } from '@/lib/utils';

const STATS = [
  { value: '12,400+', label: 'Jobs completed' },
  { value: '11 min', label: 'Avg dispatch time' },
  { value: '4.8★', label: 'Average rating' },
];

const STEPS = [
  { n: 1, title: 'Pick a service', body: 'Choose a package or describe a custom problem.' },
  { n: 2, title: 'Auto-dispatch', body: 'We match the nearest qualified, available engineer.' },
  { n: 3, title: 'Track live', body: 'Follow the engineer to your site in real time.' },
  { n: 4, title: 'Verify & pay', body: 'Approve with an OTP — you pay only when done.' },
];

export default async function HomePage() {
  const services = await getServices();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <Container className="grid gap-10 py-20 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-5">
            <Badge tone="primary" className="w-fit">On-demand IT services</Badge>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-ink md:text-5xl">
              Verified IT engineers, dispatched in minutes.
            </h1>
            <p className="max-w-md text-lg text-muted">
              Network, cloud, security, system-admin and helpdesk work for your business —
              auto-matched, tracked live, and verified with an OTP. You only pay when the job is done.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/services">Book a service</Link></Button>
              <Button asChild size="lg" variant="ghost"><Link href="/#engineers">Join as an engineer</Link></Button>
            </div>
          </div>
          {/* Dispatch concept illustration */}
          <div className="relative grid h-72 place-items-center overflow-hidden rounded-lg border border-line bg-surface-alt">
            <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_30%,var(--primary),transparent_45%),radial-gradient(circle_at_70%_70%,var(--accent),transparent_45%)]" />
            <div className="z-10 text-center">
              <div className="text-5xl">📍</div>
              <p className="mt-2 text-sm font-medium text-muted">Live dispatch · 6 engineers nearby</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="bg-bg">
        <Container className="grid grid-cols-3 gap-4 py-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl font-extrabold text-ink md:text-3xl">{s.value}</div>
              <div className="text-xs text-muted md:text-sm">{s.label}</div>
            </div>
          ))}
        </Container>
      </section>

      {/* Services grid */}
      <section className="bg-bg">
        <Container className="py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">Popular services</h2>
            <Link href="/services" className="text-sm font-medium text-primary">View all →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-card">
                  <Badge tone="accent" className="mb-3">{s.category}</Badge>
                  <CardTitle>{s.name}</CardTitle>
                  <CardMuted className="mt-1 line-clamp-2">{s.summary}</CardMuted>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-ink">From {formatINR(s.price)}</span>
                    <span className="text-sm text-muted">{s.rating}★</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how" className="bg-surface">
        <Container className="py-16">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink">How it works</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <Card key={s.n}>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft font-bold text-primary">{s.n}</div>
                <CardTitle className="mt-3 text-base">{s.title}</CardTitle>
                <CardMuted className="mt-1">{s.body}</CardMuted>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA band */}
      <section id="engineers" className="bg-bg">
        <Container className="py-16">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-primary px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-primary-foreground">
              Ready to get your IT sorted?
            </h2>
            <p className="max-w-md text-primary-foreground/80">
              Book a verified engineer in minutes, or join Servora as an engineer and grow your earnings.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="amber" size="lg"><Link href="/services">Book a service</Link></Button>
              <Button asChild variant="ghost" size="lg" className="border-white/30 text-primary-foreground hover:bg-white/10">
                <Link href="/services">Join as an engineer</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
