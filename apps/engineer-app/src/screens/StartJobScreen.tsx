import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, OtpBoxes, useScreenCaptureGuard, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';

export function StartJobScreen({ navigation }: AppScreenProps<'StartJob'>) {
  const t = useTheme();
  useScreenCaptureGuard(); // block screenshots on the OTP screen (B5)
  const startJob = useJobStore((s) => s.startJob);
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Start job" onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 34 }}>🔑</Text>
          <Text style={{ color: t.colors.ink, fontWeight: '700', fontSize: 16 }}>Enter the start OTP</Text>
          <Text style={{ color: t.colors.muted, textAlign: 'center' }}>
            Ask the customer for the 4-digit code shown in their app.
          </Text>
          <OtpBoxes value={code} onChangeText={setCode} editable />
        </Card>
        <View style={{ flex: 1 }} />
        <Button
          title="Verify & start"
          block
          disabled={code.length !== 4}
          onPress={() => {
            // Real verification is server-side; mock accepts the entered code.
            startJob();
            navigation.replace('JobInProgress');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
