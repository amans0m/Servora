'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { usePayments } from '@/features/admin/queries2';
import { formatINR } from '@/lib/utils';

export default function PaymentsPage() {
  const { data, isLoading } = usePayments();
  if (isLoading || !data) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">Payments &amp; payouts</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="To collect on completion" value={formatINR(data.kpis.toCollect)} />
        <Kpi label="Commission (captured)" value={formatINR(data.kpis.commission)} />
        <Kpi label="Pending payouts" value={formatINR(data.kpis.pendingPayouts)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Job</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Customer paid</th>
              <th className="px-4 py-2.5 font-medium">Engineer payout</th>
              <th className="px-4 py-2.5 font-medium">Commission</th>
              <th className="px-4 py-2.5 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((t) => (
              <tr key={t.jobId} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{t.jobId}</td>
                <td className="px-4 py-3">{t.customer}</td>
                <td className="px-4 py-3">{t.customerPaid ? formatINR(t.customerPaid) : '—'}</td>
                <td className="px-4 py-3">{t.payout ? formatINR(t.payout) : '—'}</td>
                <td className="px-4 py-3">{t.commission ? formatINR(t.commission) : '—'}</td>
                <td className="px-4 py-3">
                  {t.state === 'captured' ? (
                    <Badge tone="success">Captured</Badge>
                  ) : (
                    <Badge tone="muted">Charges on completion</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
