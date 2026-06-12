/**
 * Client-readable config. Only NON-secret values (a mock flag) — never API
 * keys or tokens (SECURITY.md B1). Tokens live in httpOnly cookies via the BFF.
 */
export const clientConfig = {
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS !== 'false',
};
