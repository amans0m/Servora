'use client';

import { type ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/data-table';
import { useCustomers } from '@/features/admin/queries2';
import type { Customer } from '@/lib/admin-data2';
import { formatINR } from '@/lib/utils';

const columns: ColumnDef<Customer>[] = [
  { accessorKey: 'company', header: 'Company', cell: (c) => <span className="font-medium text-ink">{c.getValue<string>()}</span> },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'jobs', header: 'Jobs' },
  { accessorKey: 'ltv', header: 'Lifetime value', cell: (c) => formatINR(c.getValue<number>()) },
  {
    accessorKey: 'engineerRating',
    header: 'Engineer rating',
    cell: (c) => {
      const r = c.getValue<number | null>();
      return r ? <span title="How engineers rate this customer (admin-only)">{r}★</span> : <span className="text-muted">—</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (c) => (
      <Badge tone={c.getValue<string>() === 'active' ? 'success' : 'danger'}>{c.getValue<string>()}</Badge>
    ),
  },
];

export default function CustomersPage() {
  const { data = [], isLoading } = useCustomers();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <p className="text-sm text-muted">
        The engineer-rating column is private — how engineers rate each customer (flags difficult accounts).
      </p>
      {isLoading ? <p className="text-muted">Loading…</p> : <DataTable columns={columns} data={data} />}
    </div>
  );
}
