import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'amber' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean; // full width
  left?: React.ReactNode;
  testID?: string;
}

/**
 * Primary (solid indigo), Amber (offers), Ghost (secondary), Danger.
 * Matches the prototype's button system.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  block,
  left,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const bg = {
    primary: t.colors.primary,
    amber: t.colors.signal,
    ghost: 'transparent',
    danger: t.colors.danger,
  }[variant];
  const fg =
    variant === 'ghost' ? t.colors.ink : variant === 'amber' ? '#1A1206' : t.colors.primaryInk;
  const border: ViewStyle =
    variant === 'ghost' ? { borderWidth: 1, borderColor: t.colors.line } : {};

  return (
    <Pressable
      testID={testID}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderRadius: t.radius.sm, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        border,
        block && { alignSelf: 'stretch' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {left}
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '700' },
});
