'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { useEngineers } from '@/features/admin/queries';
import type { ActiveEngineer, PendingEngineer } from '@/lib/admin-data';

export default function EngineersPage() {
  const { data } = useEngineers();
  const [pending, setPending] = React.useState<PendingEngineer[]>([]);
  const [active, setActive] = React.useState<ActiveEngineer[]>([]);
  React.useEffect(() => {
    if (data) {
      setPending(data.pending);
      setActive(data.active);
    }
  }, [data]);

  const approve = (e: PendingEngineer) => {
    setPending((p) => p.filter((x) => x.id !== e.id));
    setActive((a) => [
      { id: e.id, name: e.name, skills: e.skills, rating: 0, jobs: 0, tier: 'Bronze', status: 'offline' },
      ...a,
    ]);
  };
  const reject = (id: string) => setPending((p) => p.filter((x) => x.id !== id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Engineers</h1>

      {/* Pending approval */}
      <div className="flex flex-col gap-3">
        <CardTitle className="text-base">Pending approval (KYC passed)</CardTitle>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">No engineers awaiting approval.</p>
        ) : (
          pending.map((e) => {
            const allPassed = e.kyc.aadhaar && e.kyc.pan && e.kyc.bank;
            return (
              <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{e.name}</div>
                  <div className="text-sm text-muted">{e.skills.join(', ')} · applied {e.appliedAt}</div>
                  <div className="mt-2 flex gap-2">
                    <KycPill label="Aadhaar" ok={e.kyc.aadhaar} />
                    <KycPill label="PAN" ok={e.kyc.pan} />
                    <KycPill label="Bank" ok={e.kyc.bank} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!allPassed} onClick={() => approve(e)}>View &amp; approve</Button>
                  <Button size="sm" variant="danger" onClick={() => reject(e.id)}>Reject</Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Active engineers */}
      <div className="flex flex-col gap-3">
        <CardTitle className="text-base">Active engineers</CardTitle>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Skills</th>
                <th className="px-4 py-2.5 font-medium">Rating</th>
                <th className="px-4 py-2.5 font-medium">Jobs</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map((e) => (
                <tr key={e.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{e.name}</td>
                  <td className="px-4 py-3 text-muted">{e.skills.join(', ')}</td>
                  <td className="px-4 py-3">{e.rating ? `${e.rating}★` : '—'}</td>
                  <td className="px-4 py-3">{e.jobs}</td>
                  <td className="px-4 py-3"><Badge tone="primary">{e.tier}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === 'online' ? 'success' : 'muted'}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KycPill({ label, ok }: { label: string; ok: boolean }) {
  return <Badge tone={ok ? 'success' : 'danger'}>{label} {ok ? '✓' : '✗'}</Badge>;
}
