import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, StatusBadge, useTheme } from '@servora/mobile-shared';

import type { AuthScreenProps } from '../navigation/types';
import { useLogin } from '../features/auth';

const CHECKS = [
  { label: 'Identity (Aadhaar)', done: true },
  { label: 'PAN', done: true },
  { label: 'Bank account', done: true },
  { label: 'Skills & certifications', done: true },
];

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const t = useTheme();
  const login = useLogin();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Text style={{ color: t.colors.primary, fontSize: 30, fontWeight: '800' }}>Servora Partner</Text>
        <Text style={{ color: t.colors.muted }}>Your verification status</Text>

        <Card style={{ gap: 10 }}>
          {CHECKS.map((c) => (
            <View key={c.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: t.colors.ink }}>{c.label}</Text>
              <Text style={{ color: c.done ? t.colors.success : t.colors.muted }}>{c.done ? '✓ Verified' : 'Pending'}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
            <StatusBadge tone="done" label="READY TO WORK" />
          </View>
        </Card>

        <Button title="Enter dashboard" block loading={login.isPending} onPress={() => login.mutate({ email: 'rohit@eng.example', password: 'Servora@123' })} />
        <Button title="View design system" variant="ghost" block onPress={() => navigation.navigate('DesignSystem')} />
      </View>
    </SafeAreaView>
  );
}
