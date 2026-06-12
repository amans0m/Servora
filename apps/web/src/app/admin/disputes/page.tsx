'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDisputes } from '@/features/admin/queries2';
import type { Dispute } from '@/lib/admin-data2';

const sevTone = (s: Dispute['severity']) => (s === 'high' ? 'danger' : s === 'medium' ? 'signal' : 'muted');
const statusTone = (s: Dispute['status']) => (s === 'resolved' ? 'success' : s === 'rejected' ? 'danger' : 'signal');

export default function DisputesPage() {
  const { data } = useDisputes();
  const [rows, setRows] = React.useState<Dispute[]>([]);
  React.useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const resolve = (id: string, status: 'resolved' | 'rejected') =>
    setRows((r) => r.map((d) => (d.id === id ? { ...d, status } : d)));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Disputes &amp; support</h1>

      {rows.map((d) => (
        <Card key={d.id} className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{d.category}</span>
              <Badge tone={sevTone(d.severity)}>{d.severity}</Badge>
              <Badge tone={statusTone(d.status)}>{d.status}</Badge>
            </div>
            <div className="mt-1 font-mono text-xs text-muted">{d.bookingId}</div>
            <p className="mt-2 max-w-2xl text-sm text-muted">{d.context}</p>
          </div>
          {d.status === 'open' ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => resolve(d.id, 'resolved')}>Resolve</Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(d.id, 'rejected')}>Reject</Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
