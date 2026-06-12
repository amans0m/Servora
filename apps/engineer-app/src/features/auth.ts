import { useMutation } from '@tanstack/react-query';
import { useSessionStore } from '@servora/mobile-shared';

import { apiClient } from '../services/api';
import { config } from '../services/config';
import { mockApi, type AuthResult } from '../services/mock';
import { registerForPush } from '../services/push';

/** Login mutation — uses the mock layer until the backend switch is flipped. */
export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (vars: { email: string; password: string }): Promise<AuthResult> => {
      if (config.useMocks) return mockApi.login(vars.email, vars.password);
      const tokens = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email: vars.email, password: vars.password },
        { auth: false },
      );
      return { ...tokens, user: { id: 'me', role: 'engineer' } };
    },
    onSuccess: async (data) => {
      await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      void registerForPush();
    },
  });
}

export function useLogout() {
  const clear = useSessionStore((s) => s.clear);
  return () => clear();
}
