import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, Chip, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';

const SLOTS = ['09:00–11:00', '11:00–13:00', '14:00–16:00', '16:00–18:00'];
const DAYS = ['Today', 'Tomorrow', 'Mon', 'Tue'];

export function RescheduleScreen({ route, navigation }: AppScreenProps<'Reschedule'>) {
  const t = useTheme();
  const reschedule = useBookingStore((s) => s.reschedule);
  const [day, setDay] = useState('Tomorrow');
  const [slot, setSlot] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Reschedule" onBack={() => navigation.goBack()} />
      <View style={{ padding: 16, gap: 14 }}>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Date</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {DAYS.map((d) => <Chip key={d} label={d} selected={day === d} onPress={() => setDay(d)} />)}
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Time slot</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {SLOTS.map((s) => <Chip key={s} label={s} selected={slot === s} onPress={() => setSlot(s)} />)}
          </View>
        </Card>
        <Button
          title="Confirm reschedule"
          block
          disabled={!slot}
          onPress={() => {
            reschedule(route.params.bookingId, `${day} ${slot}`);
            navigation.navigate('Tabs');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
