import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, OtpBoxes, useScreenCaptureGuard, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import { openCheckout } from '../services/payments';

const METHODS = ['UPI', 'Card', 'Net banking'] as const;

export function CompletePayScreen({ route, navigation }: AppScreenProps<'CompletePay'>) {
  const t = useTheme();
  useScreenCaptureGuard(); // block screenshots on the payment/OTP screen (B5)
  const booking = useBookingStore((s) => s.bookings.find((b) => b.id === route.params.bookingId));
  const pay = useBookingStore((s) => s.pay);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('UPI');
  const [paying, setPaying] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <AppBar title="Complete & pay" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const paid = booking.paid;

  const onPay = async () => {
    setPaying(true);
    // Official Razorpay checkout (native) / stub (web). The completion OTP is
    // revealed only after a successful capture (§6). Real capture is server-side.
    const result = await openCheckout({ amount: booking.total, bookingId: booking.id });
    if (result.success) pay(booking.id, method);
    setPaying(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Complete & pay" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Engineer marked the job done</Text>
          <Text style={{ color: t.colors.muted, marginTop: 4 }}>Review the proof, then pay to close the job.</Text>
        </Card>

        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 8 }}>Proof of work</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {booking.proof.map((p) => (
              <View key={p} style={{ width: 80, height: 80, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🖼️</Text>
              </View>
            ))}
          </View>
        </Card>

        {!paid ? (
          <Card>
            <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 8 }}>Payment method</Text>
            {METHODS.map((m) => (
              <Pressable key={m} onPress={() => setMethod(m)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ color: t.colors.ink }}>{m}</Text>
                <Text style={{ color: method === m ? t.colors.primary : t.colors.muted }}>{method === m ? '◉' : '○'}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.colors.ink, fontWeight: '800' }}>Amount payable</Text>
          <Text style={{ color: t.colors.ink, fontWeight: '800' }}>₹{booking.total.toLocaleString('en-IN')}</Text>
        </Card>

        {/* OTP — locked until payment succeeds (§6) */}
        <Card style={{ gap: 8, alignItems: 'center' }}>
          {paid ? (
            <>
              <Text style={{ color: t.colors.success, fontWeight: '700' }}>🔓 Completion OTP</Text>
              <Text style={{ color: t.colors.muted, fontSize: 13 }}>Read it to the engineer to close the job.</Text>
              <OtpBoxes value={booking.completionOtp ?? ''} />
            </>
          ) : (
            <>
              <Text style={{ color: t.colors.muted, fontWeight: '700' }}>🔒 Completion OTP locked</Text>
              <Text style={{ color: t.colors.muted, fontSize: 13 }}>Appears only after payment succeeds.</Text>
              <OtpBoxes value="0000" locked />
            </>
          )}
        </Card>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.colors.line, backgroundColor: t.colors.surface }}>
        {paid ? (
          <Button title="Continue to rating" block onPress={() => navigation.replace('RateJob', { bookingId: booking.id })} />
        ) : (
          <Button title={`Pay ₹${booking.total.toLocaleString('en-IN')} and complete`} block loading={paying} onPress={onPay} />
        )}
      </View>
    </SafeAreaView>
  );
}
