import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ListRow, useTheme } from '@servora/mobile-shared';

import { useJobStore } from '../store/job.store';

export function EarningsScreen() {
  const t = useTheme();
  const { earningsWeek, withdrawable, payouts } = useJobStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Earnings</Text>

        <Card>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>THIS WEEK</Text>
          <Text style={{ color: t.colors.ink, fontSize: 28, fontWeight: '800', marginTop: 4 }}>₹{earningsWeek.toLocaleString('en-IN')}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 2 }}>4.8★ avg rating</Text>
        </Card>

        <Card style={{ backgroundColor: t.colors.successSoft }}>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>WITHDRAWABLE</Text>
          <Text style={{ color: t.colors.success, fontSize: 24, fontWeight: '800', marginTop: 4 }}>₹{withdrawable.toLocaleString('en-IN')}</Text>
          <View style={{ height: 8 }} />
          <Button title="Withdraw to bank" onPress={() => {}} />
        </Card>

        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Recent payouts</Text>
        <Card style={{ paddingVertical: 4 }}>
          {payouts.map((p) => (
            <ListRow
              key={p.id}
              title={p.job}
              subtitle={p.when}
              right={<Text style={{ color: t.colors.success, fontWeight: '700' }}>+₹{p.amount.toLocaleString('en-IN')}</Text>}
            />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
