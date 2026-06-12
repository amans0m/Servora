'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useIncentives } from '@/features/admin/queries2';
import type { IncentiveProgram } from '@/lib/admin-data2';
import { formatINR } from '@/lib/utils';

export default function IncentivesPage() {
  const { data, isLoading } = useIncentives();
  const [programs, setPrograms] = React.useState<IncentiveProgram[]>([]);
  React.useEffect(() => {
    if (data) setPrograms(data.programs);
  }, [data]);

  if (isLoading || !data) return <p className="text-muted">Loading…</p>;
  const toggle = (id: string) => setPrograms((p) => p.map((x) => (x.id === id ? { ...x, live: !x.live } : x)));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Engineer incentives</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Bonuses paid (mo)" value={formatINR(data.kpis.bonusesPaid)} />
        <Kpi label="Jobs-per-engineer lift" value={data.kpis.jobsLift} />
        <Kpi label="Active quests" value={String(data.kpis.activeQuests)} />
      </div>

      {/* Programs */}
      <div className="flex flex-col gap-3">
        <CardTitle className="text-base">Programs</CardTitle>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-2.5 font-medium">Program</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Reward</th>
                <th className="px-4 py-2.5 font-medium">Live</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-4 py-3"><Badge tone="primary">{p.type}</Badge></td>
                  <td className="px-4 py-3 text-signal">{p.reward}</td>
                  <td className="px-4 py-3"><Switch checked={p.live} onCheckedChange={() => toggle(p.id)} aria-label={`Toggle ${p.name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tiers */}
      <div className="flex flex-col gap-3">
        <CardTitle className="text-base">Engineer tiers</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.tiers.map((tier) => (
            <Card key={tier.name}>
              <div className="font-display text-lg font-bold text-ink">{tier.name}</div>
              <Badge tone="success" className="mt-1">{tier.commission}% commission</Badge>
              <p className="mt-2 text-xs text-muted">{tier.requirement}</p>
              <p className="mt-1 text-xs text-muted">{tier.perks}</p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted">Lower commission = engineer keeps more. Higher tiers also get priority dispatch.</p>
      </div>

      {/* Recent bonuses */}
      <div className="flex flex-col gap-3">
        <CardTitle className="text-base">Recently earned</CardTitle>
        <Card className="py-2">
          {data.recentBonuses.map((b, i) => (
            <div key={i} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0">
              <span className="text-ink">{b.engineer} · <span className="text-muted">{b.program}</span></span>
              <span className="font-semibold text-success">+{formatINR(b.amount)} <span className="text-xs font-normal text-muted">{b.when}</span></span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold">{value}</div>
    </Card>
  );
}
