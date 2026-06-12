'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardMuted, CardTitle } from '@/components/ui/card';
import { loginRequest } from '@/lib/api-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('super@servora.io');
  const [password, setPassword] = React.useState('Servora@123');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginRequest(email, password);
      router.replace('/admin/dashboard');
    } catch {
      setError('Invalid credentials'); // uniform — no enumeration (B-A6)
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <Card className="w-full max-w-sm">
        <CardTitle className="text-2xl">Servora Admin</CardTitle>
        <CardMuted className="mt-1">Sign in to the operations panel.</CardMuted>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="username" />
          <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </Card>
    </div>
  );
}
