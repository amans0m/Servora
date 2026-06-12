import { create } from 'zustand';

import type { ThemeMode } from '../theme/tokens';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/** App-wide theme mode (prototype defaults to dark with a light toggle). */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: (mode) => set({ mode }),
  toggle: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
}));
