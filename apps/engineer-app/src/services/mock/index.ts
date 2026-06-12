import type { SessionUser } from '@servora/mobile-shared';

/**
 * Mock data layer (swappable via config.useMocks). Lets the app run fully
 * before the backend is wired; Phase 4 flips the switch to the real client.
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export const mockApi = {
  async login(email: string, _password: string): Promise<AuthResult> {
    await delay(400);
    return {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
      user: { id: 'eng_mock', role: 'engineer', name: email.split('@')[0] || 'Acme' },
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
