import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useService, findCoupon } from '../features/catalog';
import { quote, useBookingStore } from '../store/booking.store';
import type { Coupon } from '../types';
import { fieldStyle } from '../components/field';

export function ConfirmBookingScreen({ route, navigation }: AppScreenProps<'ConfirmBooking'>) {
  const t = useTheme();
  const { data: service } = useService(route.params.serviceId);
  const createStandard = useBookingStore((s) => s.createStandard);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [address] = useState('HQ — 12 MG Road, Bengaluru');

  const selectedAddons = useMemo(
    () => service?.addons.filter((a) => route.params.addonIds.includes(a.id)) ?? [],
    [service, route.params.addonIds],
  );
  const subtotal = (service?.price ?? 0) + selectedAddons.reduce((s, a) => s + a.price, 0);
  const q = quote(subtotal, coupon);

  if (!service) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <AppBar title="Confirm booking" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const applyCoupon = () => {
    const c = findCoupon(code);
    if (!c) {
      setCoupon(null);
      setCouponError('Coupon not found');
      return;
    }
    setCoupon(c);
    setCouponError(null);
  };

  const confirm = () => {
    const id = createStandard({ service, addons: selectedAddons, address, coupon });
    // No payment here — opens live tracking (§6).
    navigation.replace('LiveTracking', { bookingId: id });
  };

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: strong ? t.colors.ink : t.colors.muted, fontWeight: strong ? '800' : '400' }}>{label}</Text>
      <Text style={{ color: strong ? t.colors.ink : t.colors.muted, fontWeight: strong ? '800' : '400' }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Confirm booking" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{service.name}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 4 }}>{address}</Text>
          {selectedAddons.map((a) => (
            <Text key={a.id} style={{ color: t.colors.muted, marginTop: 2, fontSize: 13 }}>+ {a.name}</Text>
          ))}
        </Card>

        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 8 }}>Coupon</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="SAVE20" placeholderTextColor={t.colors.muted} style={[fieldStyle(t), { flex: 1 }]} />
            <Button title="Apply" variant="amber" onPress={applyCoupon} />
          </View>
          {couponError ? <Text style={{ color: t.colors.danger, marginTop: 6 }}>{couponError}</Text> : null}
          {coupon ? <Text style={{ color: t.colors.success, marginTop: 6 }}>{coupon.label} applied</Text> : null}
        </Card>

        <Card>
          <Row label="Subtotal" value={`₹${q.subtotal.toLocaleString('en-IN')}`} />
          {q.discount > 0 ? <Row label="Discount" value={`−₹${q.discount.toLocaleString('en-IN')}`} /> : null}
          <Row label="Taxes (18%)" value={`₹${q.tax.toLocaleString('en-IN')}`} />
          <View style={{ height: 1, backgroundColor: t.colors.line, marginVertical: 6 }} />
          <Row label="Payable on completion" value={`₹${q.total.toLocaleString('en-IN')}`} strong />
        </Card>

        <Text style={{ color: t.colors.muted, fontSize: 12, textAlign: 'center' }}>
          🔒 No payment now. You'll pay when the job is done — your OTP appears right after payment.
        </Text>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.colors.line, backgroundColor: t.colors.surface }}>
        <Button title="Confirm booking" block onPress={confirm} />
      </View>
    </SafeAreaView>
  );
}
