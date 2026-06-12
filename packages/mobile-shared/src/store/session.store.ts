import { create } from 'zustand';

import { secureDelete, secureGet, secureSet } from '../services/secureStore';

const ACCESS_KEY = 'servora.accessToken';
const REFRESH_KEY = 'servora.refreshToken';
const USER_KEY = 'servora.user';

export interface SessionUser {
  id: string;
  role: string;
  name?: string;
}

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
  setSession: (s: {
    accessToken: string;
    refreshToken: string;
    user?: SessionUser | null;
  }) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Session state (SECURITY.md B1). Tokens persist to secure storage and are
 * mirrored in memory for request signing. Cleared on logout / refresh failure.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  isAuthenticated: () => Boolean(get().accessToken),

  hydrate: async () => {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
      secureGet(ACCESS_KEY),
      secureGet(REFRESH_KEY),
      secureGet(USER_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      user: userRaw ? (JSON.parse(userRaw) as SessionUser) : null,
      hydrated: true,
    });
  },

  setSession: async ({ accessToken, refreshToken, user }) => {
    set({ accessToken, refreshToken, user: user ?? get().user });
    await Promise.all([
      secureSet(ACCESS_KEY, accessToken),
      secureSet(REFRESH_KEY, refreshToken),
      user ? secureSet(USER_KEY, JSON.stringify(user)) : Promise.resolve(),
    ]);
  },

  clear: async () => {
    set({ accessToken: null, refreshToken: null, user: null });
    await Promise.all([
      secureDelete(ACCESS_KEY),
      secureDelete(REFRESH_KEY),
      secureDelete(USER_KEY),
    ]);
  },
}));
