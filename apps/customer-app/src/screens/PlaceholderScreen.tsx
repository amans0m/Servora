import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@servora/mobile-shared';

/** Phase 1 placeholder; the real screen is built in Phase 2. */
export function PlaceholderScreen({ title }: { title: string }) {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={{ color: t.colors.ink, fontSize: 22, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: t.colors.muted }}>Built in Phase 2</Text>
      </View>
    </SafeAreaView>
  );
}
