import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import { mockEngineers } from '../services/mock/data';

export function ChangeEngineerScreen({ route, navigation }: AppScreenProps<'ChangeEngineer'>) {
  const t = useTheme();
  const booking = useBookingStore((s) => s.bookings.find((b) => b.id === route.params.bookingId));
  const change = useBookingStore((s) => s.changeEngineer);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Change engineer" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {booking?.engineer ? (
          <Card>
            <Text style={{ color: t.colors.muted, fontSize: 12 }}>CURRENTLY ASSIGNED</Text>
            <Text style={{ color: t.colors.ink, fontWeight: '700', marginTop: 4 }}>
              {booking.engineer.name} · {booking.engineer.rating}★
            </Text>
          </Card>
        ) : null}

        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Alternative engineers</Text>
        {mockEngineers.map((e) => (
          <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{e.name}</Text>
              <Text style={{ color: t.colors.muted, fontSize: 13 }}>
                {e.rating}★ · {e.distanceKm} km · {e.skills.join(', ')}
              </Text>
            </View>
            <Button
              title="Assign"
              onPress={() => {
                change(route.params.bookingId, e);
                navigation.goBack();
              }}
            />
          </Card>
        ))}

        <Button title="Reschedule for later instead" variant="ghost" block onPress={() => navigation.replace('Reschedule', { bookingId: route.params.bookingId })} />
      </ScrollView>
    </SafeAreaView>
  );
}
