'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAdminServices } from '@/features/admin/queries';
import type { AdminService } from '@/lib/admin-data';
import { formatINR } from '@/lib/utils';

export default function ServicesAdminPage() {
  const { data } = useAdminServices();
  const [rows, setRows] = React.useState<AdminService[]>([]);
  React.useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const [draft, setDraft] = React.useState({ name: '', category: 'Network', price: '' });

  const addService = () => {
    if (!draft.name || !draft.price) return;
    setRows((r) => [
      { id: `s_${Date.now()}`, name: draft.name, category: draft.category, price: Number(draft.price), durationMin: 60, live: false },
      ...r,
    ]);
    setDraft({ name: '', category: 'Network', price: '' });
  };

  const toggleLive = (id: string) => setRows((r) => r.map((s) => (s.id === id ? { ...s, live: !s.live } : s)));
  const setPrice = (id: string, price: number) => setRows((r) => r.map((s) => (s.id === id ? { ...s, price } : s)));

  const field = 'rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Services catalog</h1>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Name</label>
          <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New service" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Category</label>
          <select className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {['Network', 'Cloud', 'Security', 'Sysadmin', 'Helpdesk'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Price (₹)</label>
          <input className={field} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, '') })} placeholder="4999" />
        </div>
        <Button onClick={addService}>Add service</Button>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Duration</th>
              <th className="px-4 py-2.5 font-medium">Live</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                <td className="px-4 py-3"><Badge tone="accent">{s.category}</Badge></td>
                <td className="px-4 py-3">
                  <input
                    className="w-24 rounded-sm border border-line bg-surface px-2 py-1 text-sm"
                    value={s.price}
                    onChange={(e) => setPrice(s.id, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  />
                </td>
                <td className="px-4 py-3 text-muted">{s.durationMin} min</td>
                <td className="px-4 py-3">
                  <Switch checked={s.live} onCheckedChange={() => toggleLive(s.id)} aria-label={`Toggle ${s.name}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
