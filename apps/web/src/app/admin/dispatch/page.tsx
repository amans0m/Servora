'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardMuted, CardTitle } from '@/components/ui/card';
import { candidatesFor, useDispatchQueue } from '@/features/admin/queries';
import type { DispatchJob } from '@/lib/admin-data';
import { cn } from '@/lib/utils';

export default function DispatchPage() {
  const { data } = useDispatchQueue();
  const [queue, setQueue] = React.useState<DispatchJob[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (data) {
      setQueue(data);
      setSelected((s) => s ?? data[0]?.id ?? null);
    }
  }, [data]);

  const job = queue.find((j) => j.id === selected) ?? null;
  const candidates = job ? [...candidatesFor(job.id)].sort((a, b) => a.score - b.score) : [];

  const assign = (jobId: string) => {
    setQueue((q) => q.filter((j) => j.id !== jobId));
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Live dispatch</h1>

      {/* Map */}
      <Card className="relative grid h-56 place-items-center overflow-hidden">
        <div className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_40%_40%,var(--primary),transparent_45%),radial-gradient(circle_at_70%_60%,var(--accent),transparent_45%)]" />
        <div className="z-10 text-center">
          <div className="text-4xl">🗺️</div>
          <CardMuted className="mt-1">
            {job ? `${job.customer} · ${candidates.length} engineers in range` : 'Select a job to view nearby engineers'}
          </CardMuted>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Unassigned queue */}
        <div className="flex flex-col gap-3">
          <CardTitle className="text-base">Unassigned queue</CardTitle>
          {queue.length === 0 ? (
            <p className="text-sm text-muted">Queue is clear. 🎉</p>
          ) : (
            queue.map((j) => (
              <button key={j.id} onClick={() => setSelected(j.id)} className="text-left">
                <Card className={cn('transition-colors', selected === j.id && 'border-primary ring-1 ring-primary')}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">{j.id}</span>
                    <Badge tone="signal">NEEDS ENGINEER</Badge>
                  </div>
                  <div className="mt-1 font-semibold text-ink">{j.service}</div>
                  <CardMuted>{j.customer} · {j.address}</CardMuted>
                </Card>
              </button>
            ))
          )}
        </div>

        {/* Best-match list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Best match</CardTitle>
            {job ? (
              <Button size="sm" disabled={candidates.length === 0} onClick={() => assign(job.id)}>
                Auto-assign best
              </Button>
            ) : null}
          </div>
          {!job ? (
            <p className="text-sm text-muted">Select a job from the queue.</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted">No engineers in range — widen radius or assign later.</p>
          ) : (
            candidates.map((c, i) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{c.name}</span>
                    {i === 0 ? <Badge tone="success">TOP MATCH</Badge> : null}
                  </div>
                  <CardMuted>
                    {c.rating}★ · {c.distanceKm} km · load {c.currentLoad} · {c.skills.join(', ')}
                  </CardMuted>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted">score {c.score.toFixed(2)}</span>
                  <Button size="sm" variant="ghost" onClick={() => assign(job.id)}>Assign</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
