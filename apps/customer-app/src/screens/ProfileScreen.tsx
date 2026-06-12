import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ListRow, StatusBadge, useTheme, useThemeMode } from '@servora/mobile-shared';

import { useLogout } from '../features/auth';

const SETTINGS = ['Addresses', 'Payment methods', 'Invoices & GST', 'Support'];

export function ProfileScreen() {
  const t = useTheme();
  const { mode, toggle } = useThemeMode();
  const logout = useLogout();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Profile</Text>

        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: t.colors.ink, fontSize: 18, fontWeight: '800' }}>Acme Technologies</Text>
            <StatusBadge tone="done" label="GST VERIFIED" />
          </View>
          <Text style={{ color: t.colors.muted }}>ops@acme.example</Text>
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          {SETTINGS.map((s) => (
            <ListRow key={s} title={s} right={<Text style={{ color: t.colors.muted }}>›</Text>} onPress={() => {}} />
          ))}
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Appearance</Text>
          <Button title={`Theme: ${mode === 'dark' ? 'Dark' : 'Light'} — tap to switch`} variant="ghost" onPress={toggle} />
        </Card>

        <Button title="Log out" variant="danger" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
