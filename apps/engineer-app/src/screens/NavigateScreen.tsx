import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, DispatchMap, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';

export function NavigateScreen({ navigation }: AppScreenProps<'Navigate'>) {
  const t = useTheme();
  const job = useJobStore((s) => s.job);
  const arrive = useJobStore((s) => s.arrive);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Navigate to site" onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        <DispatchMap height={260} markers={[{ id: 'dest' }]} />
        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{job?.customerName}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 2 }}>{job?.address}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 2 }}>{job?.distanceKm} km · {job?.etaMin} min away</Text>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Open in Maps" variant="ghost" onPress={() => {}} />
          <Button title="Call" variant="ghost" onPress={() => {}} />
        </View>
        <View style={{ flex: 1 }} />
        <Button title="I've arrived" block onPress={() => { arrive(); navigation.replace('StartJob'); }} />
      </View>
    </SafeAreaView>
  );
}
