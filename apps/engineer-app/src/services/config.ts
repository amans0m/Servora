/**
 * Runtime config. API base URL + the one switch that swaps the mock data layer
 * for the real backend (SECURITY.md: HTTPS only; mocks until backend wired).
 * Values come from EXPO_PUBLIC_* env (never bundle secrets — B1).
 */
export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.servora.app',
  useMocks: (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') === 'true',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'wss://api.servora.app',
};
