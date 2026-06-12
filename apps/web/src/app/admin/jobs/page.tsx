'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/data-table';
import { useJobs } from '@/features/admin/queries';
import type { Job } from '@/lib/admin-data';
import { cn, formatINR } from '@/lib/utils';

const FILTERS = ['All', 'Active', 'Quote', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

const tone = (s: Job['status']) =>
  s === 'completed' ? 'success' : s === 'quote' ? 'accent' : s === 'awaiting_payment' ? 'muted' : 'signal';

const columns: ColumnDef<Job>[] = [
  { accessorKey: 'id', header: 'Job', cell: (c) => <span className="font-mono text-xs">{c.getValue<string>()}</span> },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'customer', header: 'Customer' },
  { accessorKey: 'engineer', header: 'Engineer', cell: (c) => c.getValue<string | null>() ?? '—' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (c) => <Badge tone={tone(c.getValue<Job['status']>())}>{c.getValue<string>().replace('_', ' ')}</Badge>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: (c) => (c.getValue<number>() ? formatINR(c.getValue<number>()) : '—'),
  },
];

export default function JobsPage() {
  const { data = [], isLoading } = useJobs();
  const [filter, setFilter] = React.useState<Filter>('All');

  const rows = data.filter((j) =>
    filter === 'All'
      ? true
      : filter === 'Quote'
        ? j.status === 'quote'
        : filter === 'Completed'
          ? j.status === 'completed'
          : ['active', 'confirmed', 'awaiting_payment'].includes(j.status),
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Jobs</h1>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium',
              filter === f ? 'border-primary bg-primary-soft text-primary' : 'border-line text-muted hover:text-ink',
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-muted">Loading…</p> : <DataTable columns={columns} data={rows} />}
    </div>
  );
}
