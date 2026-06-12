import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, OnlineToggle, ProgressBar, useTheme } from '@servora/mobile-shared';

import type { AppStackParamList } from '../navigation/types';
import { useJobStore } from '../store/job.store';
import { config } from '../services/config';
import { dispatchSocket } from '../services/socket';

export function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { online, setOnline, simulateOffer, status, earningsToday, jobsToday } = useJobStore();
  const receiveOffer = useJobStore((s) => s.receiveOffer);

  // When an offer arrives, present it (modal).
  useEffect(() => {
    if (status === 'offer') nav.navigate('IncomingOffer');
  }, [status, nav]);

  // Real dispatch offers over the authenticated socket (real backend only).
  useEffect(() => {
    if (config.useMocks || !online) return;
    const socket = dispatchSocket();
    socket.connect();
    socket.on('job:offer', (payload: any) => receiveOffer(payload));
    return () => {
      socket.disconnect();
    };
  }, [online, receiveOffer]);

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: t.colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: t.colors.ink, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{value}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Hi, Rohit</Text>
          <OnlineToggle value={online} onChange={setOnline} />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Earnings today" value={`₹${earningsToday.toLocaleString('en-IN')}`} />
          <Stat label="Jobs today" value={String(jobsToday)} />
        </View>

        {/* Quest teaser */}
        <Card style={{ gap: 8 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Weekly quest</Text>
          <Text style={{ color: t.colors.muted, fontSize: 13 }}>8 of 12 jobs · 4 more to unlock ₹800</Text>
          <ProgressBar value={8 / 12} color={t.colors.signal} />
          <Button title="View rewards" variant="ghost" onPress={() => nav.navigate('Tabs')} />
        </Card>

        {!online ? (
          <Card><Text style={{ color: t.colors.muted }}>You're offline. Go online to receive job offers.</Text></Card>
        ) : (
          <Button title="Simulate incoming job" onPress={simulateOffer} />
        )}

        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 6 }}>Upcoming scheduled</Text>
          <Text style={{ color: t.colors.muted }}>Server Administration · Tomorrow 11:00</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
