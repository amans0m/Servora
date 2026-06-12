/**
 * Design tokens lifted from servora-prototype.html (light + dark).
 * Primary indigo #4338CA, accent teal #0EA5A4, signal amber #F59E0B.
 */
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primarySoft: string;
  primaryInk: string; // text on primary
  accent: string;
  accentSoft: string;
  signal: string; // amber — offers/bonuses
  signalSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  radius: { sm: number; md: number; lg: number; pill: number };
  spacing: (n: number) => number;
  font: { body: string; display: string; mono: string };
  shadow: object;
}

const light: ThemeColors = {
  bg: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3FA',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E6E8F0',
  primary: '#4338CA',
  primarySoft: '#EEF0FF',
  primaryInk: '#FFFFFF',
  accent: '#0EA5A4',
  accentSoft: '#E6FBFA',
  signal: '#F59E0B',
  signalSoft: '#FEF3E2',
  success: '#16A34A',
  successSoft: '#E7F6EC',
  danger: '#DC2626',
  dangerSoft: '#FCEBEB',
};

const dark: ThemeColors = {
  bg: '#0B1029',
  surface: '#131A3A',
  surfaceAlt: '#1B234A',
  ink: '#F1F5F9',
  muted: '#94A3B8',
  line: '#232B4D',
  primary: '#6366F1',
  primarySoft: '#23244F',
  primaryInk: '#FFFFFF',
  accent: '#2DD4BF',
  accentSoft: '#0E2E2E',
  signal: '#FBBF24',
  signalSoft: '#3A2E12',
  success: '#34D399',
  successSoft: '#0F2E20',
  danger: '#F87171',
  dangerSoft: '#3A1A1A',
};

const base = {
  radius: { sm: 12, md: 18, lg: 24, pill: 999 },
  spacing: (n: number) => n * 4,
  font: {
    body: 'Inter, system-ui, sans-serif',
    display: 'Space Grotesk, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
};

export const themes: Record<ThemeMode, Theme> = {
  light: {
    mode: 'light',
    colors: light,
    ...base,
    shadow: {
      shadowColor: '#101637',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4,
    },
  },
  dark: {
    mode: 'dark',
    colors: dark,
    ...base,
    shadow: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
  },
};
