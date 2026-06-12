import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppBar,
  Button,
  Card,
  DispatchMap,
  OtpBoxes,
  StatusBadge,
  useScreenCaptureGuard,
  useTheme,
} from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import { config } from '../services/config';
import { trackingSocket } from '../services/socket';

const TIMELINE = ['Confirmed', 'Assigned', 'On the way', 'In progress'];

export function LiveTrackingScreen({ route, navigation }: AppScreenProps<'LiveTracking'>) {
  const t = useTheme();
  useScreenCaptureGuard(); // start OTP is on this screen (B5)
  const booking = useBookingStore((s) => s.bookings.find((b) => b.id === route.params.bookingId));
  const markAwaiting = useBookingStore((s) => s.markAwaitingPayment);
  const [engineerPos, setEngineerPos] = useState<{ latitude: number; longitude: number } | null>(null);

  // Live engineer location over the authenticated socket (real backend only).
  useEffect(() => {
    if (config.useMocks) return;
    const socket = trackingSocket();
    socket.connect();
    socket.emit('track:subscribe', { bookingId: route.params.bookingId });
    socket.on('engineer:location', (p: { lat: number; lng: number }) =>
      setEngineerPos({ latitude: p.lat, longitude: p.lng }),
    );
    return () => {
      socket.disconnect();
    };
  }, [route.params.bookingId]);

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <AppBar title="Tracking" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const dispatched = Boolean(booking.engineer);
  const activeStep = dispatched ? 2 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Live tracking" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <StatusBadge tone={dispatched ? 'live' : 'new'} label={dispatched ? 'ENGINEER EN ROUTE' : 'FINDING ENGINEER'} />
        <DispatchMap
          center={engineerPos ?? undefined}
          markers={
            engineerPos
              ? [{ id: 'e', label: booking.engineer?.name, ...engineerPos }]
              : dispatched
                ? [{ id: 'e' }]
                : []
          }
        />

        {booking.engineer ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.colors.primary, fontWeight: '800' }}>{booking.engineer.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{booking.engineer.name}</Text>
              <Text style={{ color: t.colors.muted, fontSize: 13 }}>
                {booking.engineer.rating}★ · ETA {booking.engineer.etaMin} min
              </Text>
            </View>
            <Button title="Call" variant="ghost" onPress={() => {}} />
          </Card>
        ) : (
          <Card><Text style={{ color: t.colors.muted }}>Matching the nearest skilled engineer…</Text></Card>
        )}

        {dispatched ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Change engineer" variant="ghost" onPress={() => navigation.navigate('ChangeEngineer', { bookingId: booking.id })} />
            <Button title="Reschedule" variant="ghost" onPress={() => navigation.navigate('Reschedule', { bookingId: booking.id })} />
          </View>
        ) : null}

        {/* Timeline */}
        <Card>
          {TIMELINE.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
              <Text style={{ color: i <= activeStep ? t.colors.success : t.colors.line }}>●</Text>
              <Text style={{ color: i <= activeStep ? t.colors.ink : t.colors.muted }}>{step}</Text>
            </View>
          ))}
        </Card>

        {/* Start OTP card — read it to the engineer on arrival */}
        {booking.startOtp ? (
          <Card style={{ gap: 8 }}>
            <Text style={{ color: t.colors.ink, fontWeight: '700' }}>🔑 Your start OTP</Text>
            <Text style={{ color: t.colors.muted, fontSize: 13 }}>Share with the engineer when they arrive.</Text>
            <OtpBoxes value={booking.startOtp} />
          </Card>
        ) : null}
      </ScrollView>

      {dispatched ? (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.colors.line, backgroundColor: t.colors.surface }}>
          <Button
            title="Engineer finished — complete & pay"
            block
            onPress={() => {
              markAwaiting(booking.id);
              navigation.navigate('CompletePay', { bookingId: booking.id });
            }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
