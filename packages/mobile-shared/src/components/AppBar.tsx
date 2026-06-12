import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Top row with back arrow, title and optional right action. */
export function AppBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.line,
        backgroundColor: t.colors.surface,
      }}
    >
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={{ fontSize: 22, color: t.colors.ink }}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: t.colors.ink }}>{title}</Text>
      {right}
    </View>
  );
}
