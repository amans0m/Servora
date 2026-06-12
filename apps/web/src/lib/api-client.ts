/**
 * Browser API client — calls the same-origin BFF (`/api/bff/*`), which attaches
 * the bearer + signature server-side from httpOnly cookies. The browser never
 * sees tokens or signs requests itself (SECURITY.md B1/B3).
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw data ?? { error: res.statusText };
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Auth helpers hit the dedicated auth BFF routes (not the generic proxy). */
export async function loginRequest(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json() as Promise<{ ok: true; role: string | null }>;
}

export async function logoutRequest() {
  await fetch('/api/auth/logout', { method: 'POST' });
}
