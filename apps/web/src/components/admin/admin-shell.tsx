'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { logoutRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

const NAV: { href: string; label: string; icon: string; superAdmin?: boolean }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/dispatch', label: 'Live dispatch', icon: '🛰️' },
  { href: '/admin/jobs', label: 'Jobs', icon: '🧾' },
  { href: '/admin/services', label: 'Services', icon: '🧰' },
  { href: '/admin/engineers', label: 'Engineers', icon: '👷' },
  { href: '/admin/customers', label: 'Customers', icon: '🏢' },
  { href: '/admin/payments', label: 'Payments', icon: '💳' },
  { href: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { href: '/admin/incentives', label: 'Incentives', icon: '🎯' },
  { href: '/admin/disputes', label: 'Disputes', icon: '⚖️' },
  { href: '/admin/integrations', label: 'Integrations', icon: '🔌', superAdmin: true },
];

const IDLE_MS = 15 * 60 * 1000; // auto-logout after 15 min inactivity (B3)

export function AdminShell({ role, children }: { role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => !n.superAdmin || role === 'super_admin');

  const logout = React.useCallback(async () => {
    await logoutRequest();
    router.replace('/login');
  }, [router]);

  // Inactivity auto-logout for the admin panel (B3).
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [logout]);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center px-5 font-display text-xl font-extrabold text-primary">
          Servora
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium',
                  active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-alt hover:text-ink',
                )}
              >
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3 text-xs text-muted">Role: {role}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
          <span className="text-sm text-muted">Admin panel</span>
          <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
        </header>
        <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
