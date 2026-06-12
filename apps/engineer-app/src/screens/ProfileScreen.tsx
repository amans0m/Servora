import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, ListRow, StatusBadge, useTheme, useThemeMode } from '@servora/mobile-shared';

import { useLogout } from '../features/auth';

const INITIAL_SKILLS = ['networking', 'cabling', 'wifi'];

export function ProfileScreen() {
  const t = useTheme();
  const { mode, toggle } = useThemeMode();
  const logout = useLogout();
  const [skills, setSkills] = useState(INITIAL_SKILLS);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Profile</Text>

        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: t.colors.ink, fontSize: 18, fontWeight: '800' }}>Rohit Sharma</Text>
            <StatusBadge tone="done" label="VERIFIED" />
          </View>
          <Text style={{ color: t.colors.muted }}>4.8★ · 96 jobs · Gold tier</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Skills</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((s) => <Chip key={s} label={s} selected />)}
            <Chip label="+ Add skill" onPress={() => setSkills((p) => [...p, `skill-${p.length + 1}`])} />
          </View>
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <ListRow title="Bank account" subtitle="••••4321" right={<Text style={{ color: t.colors.muted }}>›</Text>} onPress={() => {}} />
          <ListRow title="Documents (KYC)" subtitle="Verified" right={<Text style={{ color: t.colors.muted }}>›</Text>} onPress={() => {}} />
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
