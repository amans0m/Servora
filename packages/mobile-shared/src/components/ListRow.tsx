import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
}

/** Single-line repeating record — bookings, engineers, payouts, reviews. */
export function ListRow({ title, subtitle, left, right, onPress }: ListRowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.colors.ink, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: t.colors.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}
