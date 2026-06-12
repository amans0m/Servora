import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Horizontal fill bar — quest/tier progress. value 0..1. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height: 8,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: color ?? t.colors.primary,
          borderRadius: t.radius.pill,
        }}
      />
    </View>
  );
}
