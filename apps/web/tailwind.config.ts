import type { Config } from 'tailwindcss';

// Tokens are CSS variables (see styles/globals.css) so light/dark swap cleanly.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
          foreground: 'var(--primary-foreground)',
        },
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)' },
        signal: { DEFAULT: 'var(--signal)', soft: 'var(--signal-soft)' },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
      },
      borderRadius: { sm: '0.75rem', DEFAULT: '1.125rem', lg: '1.5rem' },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: { card: '0 18px 50px -20px rgba(16,22,55,.35)' },
    },
  },
  plugins: [],
};

export default config;
