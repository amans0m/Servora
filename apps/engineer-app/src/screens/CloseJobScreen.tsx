import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, OtpBoxes, useScreenCaptureGuard, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';

export function CloseJobScreen({ navigation }: AppScreenProps<'CloseJob'>) {
  const t = useTheme();
  useScreenCaptureGuard(); // block screenshots on the OTP screen (B5)
  const job = useJobStore((s) => s.job);
  const closeJob = useJobStore((s) => s.closeJob);
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Close job" onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 34 }}>🔐</Text>
          <Text style={{ color: t.colors.ink, fontWeight: '700', fontSize: 16 }}>Enter completion OTP</Text>
          <Text style={{ color: t.colors.muted, textAlign: 'center' }}>
            The customer sees this code only after they pay. Ask them to read it out.
          </Text>
          <OtpBoxes value={code} onChangeText={setCode} editable />
        </Card>

        <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.colors.muted }}>Payout on verify</Text>
          <Text style={{ color: t.colors.success, fontWeight: '800' }}>₹{(job?.payout ?? 0).toLocaleString('en-IN')}</Text>
        </Card>

        <View style={{ flex: 1 }} />
        <Button
          title="Verify & finish"
          block
          disabled={code.length !== 4}
          onPress={() => { closeJob(); navigation.replace('RateCustomer'); }}
        />
      </View>
    </SafeAreaView>
  );
}
