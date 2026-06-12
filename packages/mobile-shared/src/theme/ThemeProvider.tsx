import React, { createContext, useContext, useMemo } from 'react';

import { useThemeStore } from '../store/theme.store';
import { type Theme, themes } from './tokens';

const ThemeContext = createContext<Theme>(themes.dark);

/** Provides the active theme; mode is driven by the shared theme store. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const theme = useMemo(() => themes[mode], [mode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Convenience: theme + toggle in one hook. */
export function useThemeMode() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const setMode = useThemeStore((s) => s.setMode);
  return { mode, toggle, setMode };
}
