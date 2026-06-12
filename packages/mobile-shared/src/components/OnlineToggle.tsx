import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Green / grey switch — engineer availability (only online engineers match). */
export function OnlineToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 52,
          height: 30,
          borderRadius: 999,
          backgroundColor: value ? t.colors.success : t.colors.line,
          padding: 3,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            backgroundColor: '#fff',
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
      <Text style={{ color: t.colors.ink, fontWeight: '700' }}>
        {value ? 'Online' : 'Offline'}
      </Text>
    </Pressable>
  );
}
