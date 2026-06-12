'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/features/admin/dashboard';
import { formatINR } from '@/lib/utils';

const STATUS_TONE: Record<string, 'primary' | 'accent' | 'signal' | 'success' | 'muted'> = {
  in_progress: 'signal',
  awaiting_payment: 'muted',
  completed: 'success',
  quote: 'accent',
  confirmed: 'primary',
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return <p className="text-muted">Loading dashboard…</p>;
  }
  const k = data.kpis;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue (captured)" value={formatINR(k.revenue)} />
        <Kpi label="Commission" value={formatINR(k.commission)} />
        <Kpi label="Active jobs" value={String(k.activeJobs)} />
        <Kpi label="Engineers online" value={String(k.engineersOnline)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Revenue chart */}
        <Card>
          <CardTitle className="text-base">Revenue — last 7 days</CardTitle>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={48}
                  tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-alt)' }}
                  formatter={(v: number) => [formatINR(v), 'Revenue']}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pending payouts */}
        <Card className="self-start">
          <CardTitle className="text-base">Pending payouts</CardTitle>
          <div className="mt-3 font-display text-3xl font-extrabold">{formatINR(k.pendingPayouts.amount)}</div>
          <p className="mt-1 text-sm text-muted">{k.pendingPayouts.count} payouts awaiting release</p>
        </Card>
      </div>

      {/* Recent jobs */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle className="text-base">Recent jobs</CardTitle>
          <a href="/admin/jobs" className="text-sm font-medium text-primary">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-4 font-medium">Job</th>
                <th className="py-2 pr-4 font-medium">Service</th>
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Engineer</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.map((j) => (
                <tr key={j.id} className="border-b border-line/60">
                  <td className="py-2.5 pr-4 font-mono text-xs">{j.id}</td>
                  <td className="py-2.5 pr-4">{j.service}</td>
                  <td className="py-2.5 pr-4">{j.customer}</td>
                  <td className="py-2.5 pr-4">{j.engineer ?? '—'}</td>
                  <td className="py-2.5 pr-4">
                    <Badge tone={STATUS_TONE[j.status] ?? 'muted'}>{j.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-right">{j.amount ? formatINR(j.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
