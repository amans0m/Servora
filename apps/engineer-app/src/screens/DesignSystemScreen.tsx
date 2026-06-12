import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppBar,
  Button,
  Card,
  Chip,
  DispatchMap,
  ListRow,
  OnlineToggle,
  OtpBoxes,
  ProgressBar,
  StarRating,
  StatusBadge,
  useTheme,
  useThemeMode,
} from '@servora/mobile-shared';
import type { AuthScreenProps } from '../navigation/types';

export function DesignSystemScreen({ navigation }: AuthScreenProps<'DesignSystem'>) {
  const t = useTheme();
  const { mode, toggle } = useThemeMode();
  const [otp, setOtp] = useState('48');
  const [stars, setStars] = useState(4);
  const [online, setOnline] = useState(true);
  const [filter, setFilter] = useState('Active');

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <Text style={{ color: t.colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar
        title="Design System"
        onBack={() => navigation.goBack()}
        right={<Button title={mode === 'dark' ? '☀︎' : '☾'} variant="ghost" onPress={toggle} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Section title="Buttons">
          <Button title="Primary — Book" onPress={() => {}} />
          <Button title="Amber — Apply coupon" variant="amber" onPress={() => {}} />
          <Button title="Ghost — Reschedule" variant="ghost" onPress={() => {}} />
          <Button title="Danger — Cancel" variant="danger" onPress={() => {}} />
        </Section>

        <Section title="Status badges">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusBadge tone="new" />
            <StatusBadge tone="live" />
            <StatusBadge tone="progress" />
            <StatusBadge tone="charges" />
            <StatusBadge tone="done" />
            <StatusBadge tone="quote" />
          </View>
        </Section>

        <Section title="Chips / filters">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Active', 'Scheduled', 'Completed'].map((c) => (
              <Chip key={c} label={c} selected={filter === c} onPress={() => setFilter(c)} />
            ))}
          </View>
        </Section>

        <Section title="Card + list rows">
          <Card>
            <ListRow title="Office Network Setup" subtitle="₹4,999 · 4.8★" right={<StatusBadge tone="new" />} />
            <ListRow title="Cloud Migration Assist" subtitle="₹8,999 · 4.7★" right={<StatusBadge tone="charges" />} />
          </Card>
        </Section>

        <Section title="OTP boxes (start) + locked (pre-payment)">
          <OtpBoxes value={otp} onChangeText={setOtp} editable />
          <View style={{ height: 10 }} />
          <OtpBoxes value="7193" locked />
        </Section>

        <Section title="Star rating">
          <StarRating value={stars} onChange={setStars} />
        </Section>

        <Section title="Online toggle + progress + map">
          <OnlineToggle value={online} onChange={setOnline} />
          <View style={{ height: 10 }} />
          <ProgressBar value={0.66} />
          <View style={{ height: 10 }} />
          <DispatchMap markers={[{ id: '1' }, { id: '2' }, { id: '3' }]} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
