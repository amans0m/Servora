'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useCoupons } from '@/features/admin/queries2';
import type { Coupon } from '@/lib/admin-data2';

export default function CouponsPage() {
  const { data } = useCoupons();
  const [rows, setRows] = React.useState<Coupon[]>([]);
  React.useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const [draft, setDraft] = React.useState({ code: '', value: '', discountType: 'percent' as 'percent' | 'flat' });

  const create = () => {
    if (!draft.code || !draft.value) return;
    setRows((r) => [
      {
        id: `cp_${Date.now()}`,
        code: draft.code.toUpperCase(),
        discountType: draft.discountType,
        value: Number(draft.value),
        scope: 'all',
        used: 0,
        maxUses: null,
        expiry: '2026-12-31',
        live: false,
      },
      ...r,
    ]);
    setDraft({ code: '', value: '', discountType: 'percent' });
  };
  const toggle = (id: string) => setRows((r) => r.map((c) => (c.id === id ? { ...c, live: !c.live } : c)));

  const field = 'rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Offers &amp; coupons</h1>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Code</label>
          <input className={field} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="SAVE20" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Type</label>
          <select className={field} value={draft.discountType} onChange={(e) => setDraft({ ...draft, discountType: e.target.value as 'percent' | 'flat' })}>
            <option value="percent">Percent</option>
            <option value="flat">Flat ₹</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Value</label>
          <input className={field} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value.replace(/\D/g, '') })} placeholder="20" />
        </div>
        <Button onClick={create}>Create coupon</Button>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Discount</th>
              <th className="px-4 py-2.5 font-medium">Scope</th>
              <th className="px-4 py-2.5 font-medium">Usage</th>
              <th className="px-4 py-2.5 font-medium">Expiry</th>
              <th className="px-4 py-2.5 font-medium">Live</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-mono text-xs font-bold text-signal">{c.code}</td>
                <td className="px-4 py-3">{c.discountType === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
                <td className="px-4 py-3"><Badge tone="accent">{c.scope}</Badge></td>
                <td className="px-4 py-3 text-muted">{c.used}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="px-4 py-3 text-muted">{c.expiry}</td>
                <td className="px-4 py-3"><Switch checked={c.live} onCheckedChange={() => toggle(c.id)} aria-label={`Toggle ${c.code}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
