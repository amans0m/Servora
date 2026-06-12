/**
 * Server-only config (no NEXT_PUBLIC_ prefix → never shipped to the browser,
 * SECURITY.md B1). The API base URL + the mock switch live here.
 */
export const config = {
  apiBaseUrl: process.env.SERVORA_API_URL ?? 'http://localhost:3000',
  apiPrefix: '/api/v1',
  useMocks: (process.env.SERVORA_USE_MOCKS ?? 'true') === 'true',
};
