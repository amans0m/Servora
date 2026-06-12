import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Chip, StatusBadge, useTheme, type BadgeTone } from '@servora/mobile-shared';

import type { AppStackParamList } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import type { Booking, BookingStatus } from '../types';

const FILTERS = ['All', 'Active', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

const ACTIVE: BookingStatus[] = ['confirmed', 'en_route', 'in_progress', 'awaiting_payment'];

const tone = (s: BookingStatus): BadgeTone =>
  s === 'completed' ? 'done' : s === 'quote' ? 'quote' : s === 'awaiting_payment' ? 'charges' : s === 'confirmed' ? 'new' : 'progress';

export function BookingsScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const bookings = useBookingStore((s) => s.bookings);
  const [filter, setFilter] = useState<Filter>('All');

  const visible = bookings.filter((b) =>
    filter === 'All' ? true : filter === 'Active' ? ACTIVE.includes(b.status) : b.status === 'completed',
  );

  const open = (b: Booking) => {
    if (b.status === 'awaiting_payment') nav.navigate('CompletePay', { bookingId: b.id });
    else if (ACTIVE.includes(b.status)) nav.navigate('LiveTracking', { bookingId: b.id });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <View style={{ padding: 16, gap: 12, flex: 1 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Bookings</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
        </View>

        {visible.length === 0 ? (
          <Text style={{ color: t.colors.muted, marginTop: 20 }}>No bookings yet. Book a service from Home.</Text>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
            {visible.map((b) => (
              <Pressable key={b.id} onPress={() => open(b)}>
                <Card style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: t.colors.ink, fontWeight: '700', flex: 1 }}>{b.serviceName}</Text>
                    <StatusBadge tone={tone(b.status)} />
                  </View>
                  <Text style={{ color: t.colors.muted, fontSize: 13 }}>
                    {b.engineer ? `${b.engineer.name} · ` : ''}
                    {b.total > 0 ? `₹${b.total.toLocaleString('en-IN')}` : 'Awaiting quote'}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
