import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export type BadgeTone = 'new' | 'live' | 'progress' | 'charges' | 'done' | 'pending' | 'quote';

const TONE_LABEL: Record<BadgeTone, string> = {
  new: 'NEW',
  live: 'EN ROUTE',
  progress: 'IN PROGRESS',
  charges: 'CHARGES ON COMPLETION',
  done: 'DONE',
  pending: 'PENDING KYC',
  quote: 'QUOTE',
};

/** Tiny coloured label communicating live state of a job/engineer/coupon. */
export function StatusBadge({ tone, label }: { tone: BadgeTone; label?: string }) {
  const t = useTheme();
  const map: Record<BadgeTone, [string, string]> = {
    new: [t.colors.primary, t.colors.primarySoft],
    live: [t.colors.accent, t.colors.accentSoft],
    progress: [t.colors.signal, t.colors.signalSoft],
    charges: [t.colors.muted, t.colors.surfaceAlt],
    done: [t.colors.success, t.colors.successSoft],
    pending: [t.colors.signal, t.colors.signalSoft],
    quote: [t.colors.accent, t.colors.accentSoft],
  };
  const [fg, bg] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: t.radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
        {label ?? TONE_LABEL[tone]}
      </Text>
    </View>
  );
}
