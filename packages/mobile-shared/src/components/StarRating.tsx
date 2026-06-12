import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface StarRatingProps {
  value: number; // 0..5
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}

/** Five tappable stars (1–5) — used by customer and engineer. */
export function StarRating({ value, onChange, size = 32, readonly }: StarRatingProps) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={readonly}
          onPress={() => onChange?.(n)}
          hitSlop={6}
        >
          <Text style={{ fontSize: size, color: n <= value ? t.colors.signal : t.colors.line }}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
