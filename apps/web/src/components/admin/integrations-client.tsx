'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardMuted, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  saveIntegration,
  testIntegration,
  toggleIntegration,
  useIntegrations,
} from '@/features/admin/integrations';
import type { Integration } from '@/lib/integrations-mock';

export function IntegrationsClient() {
  const { data } = useIntegrations();
  const [items, setItems] = React.useState<Integration[]>([]);
  // Draft values being entered. NEVER pre-filled from stored values (B / §A8).
  const [drafts, setDrafts] = React.useState<Record<string, Record<string, string>>>({});
  React.useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const setDraft = (p: string, field: string, v: string) =>
    setDrafts((d) => ({ ...d, [p]: { ...d[p], [field]: v } }));

  const save = async (it: Integration) => {
    const values = drafts[it.provider] ?? {};
    await saveIntegration(it.provider, values, it.enabled);
    setItems((list) =>
      list.map((x) =>
        x.provider === it.provider
          ? {
              ...x,
              status: 'connected',
              fields: x.fields.map((f) => (values[f.field] ? { ...f, set: true } : f)),
            }
          : x,
      ),
    );
    setDrafts((d) => ({ ...d, [it.provider]: {} })); // clear — never keep the secret
  };

  const test = async (it: Integration) => {
    const res = (await testIntegration(it.provider)) as { status?: string };
    setItems((list) =>
      list.map((x) => (x.provider === it.provider ? { ...x, status: (res.status as Integration['status']) ?? x.status } : x)),
    );
  };

  const toggle = async (it: Integration) => {
    const enabled = !it.enabled;
    await toggleIntegration(it.provider, enabled);
    setItems((list) => list.map((x) => (x.provider === it.provider ? { ...x, enabled } : x)));
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Integrations</h1>
        <CardMuted className="mt-1">
          Keys are encrypted at rest and applied instantly — no redeploy. They’re never displayed after
          saving and never shipped to the apps.
        </CardMuted>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <Card key={it.provider} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{it.name}</CardTitle>
                <CardMuted>{it.purpose}</CardMuted>
              </div>
              <Badge tone={it.status === 'connected' ? 'success' : it.status === 'error' ? 'danger' : 'muted'}>
                {it.status === 'connected' ? 'Connected' : it.status === 'error' ? 'Error' : 'Not set'}
              </Badge>
            </div>

            {it.fields.map((field) => (
              <div key={field.field} className="flex flex-col gap-1">
                <label className="text-xs text-muted">
                  {field.label} {field.set ? <span className="text-success">· set</span> : <span>· not set</span>}
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={field.set ? '•••••••••• (hidden — enter to replace)' : 'Enter value'}
                  value={drafts[it.provider]?.[field.field] ?? ''}
                  onChange={(e) => setDraft(it.provider, field.field, e.target.value)}
                  className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}

            <div className="mt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted">
                <Switch checked={it.enabled} onCheckedChange={() => toggle(it)} aria-label={`Enable ${it.name}`} />
                Enabled
              </label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => test(it)}>Test</Button>
                <Button size="sm" onClick={() => save(it)}>Save</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
