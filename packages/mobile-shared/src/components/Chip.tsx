import React from 'react';
import { Pressable, Text } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Small rounded pill — filters, tags, selectable options. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: selected ? t.colors.primary : t.colors.line,
        backgroundColor: selected ? t.colors.primarySoft : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: selected ? t.colors.primary : t.colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Selectable chip that highlights when chosen (feedback tags, time slots). */
export const PickableTag = Chip;
