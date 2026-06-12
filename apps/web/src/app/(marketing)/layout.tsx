import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-extrabold text-primary">
            Servora
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <Link href="/services" className="hover:text-ink">Services</Link>
            <Link href="/#how" className="hover:text-ink">How it works</Link>
            <Link href="/#engineers" className="hover:text-ink">For engineers</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/dashboard">Admin</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/services">Get started</Link>
            </Button>
          </div>
        </Container>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-line bg-surface">
        <Container className="flex flex-col gap-2 py-10 text-sm text-muted">
          <span className="font-display text-base font-bold text-ink">Servora</span>
          <span>IT services marketplace — network · cloud · security · sys-admin · helpdesk.</span>
          <span className="text-xs">© {new Date().getFullYear()} Servora. All rights reserved.</span>
        </Container>
      </footer>
    </div>
  );
}
