import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, useTheme } from '@servora/mobile-shared';

import { useCoupons } from '../features/catalog';

export function OffersScreen() {
  const t = useTheme();
  const coupons = useCoupons();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Offers & Wallet</Text>

        <Card style={{ backgroundColor: t.colors.primarySoft }}>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>REFERRAL WALLET</Text>
          <Text style={{ color: t.colors.primary, fontSize: 28, fontWeight: '800', marginTop: 4 }}>₹750</Text>
          <Text style={{ color: t.colors.muted, fontSize: 13 }}>Credit from referrals — applied to your next booking.</Text>
        </Card>

        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Available coupons</Text>
        {coupons.map((c) => (
          <Card key={c.code} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.signal, fontWeight: '800' }}>{c.code}</Text>
              <Text style={{ color: t.colors.muted, fontSize: 13, marginTop: 2 }}>{c.label}</Text>
            </View>
            <Button title="Use" variant="amber" onPress={() => {}} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
