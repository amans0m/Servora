import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ProgressBar, StatusBadge, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';

const COUNTDOWN = 42;

export function IncomingOfferScreen({ navigation }: AppScreenProps<'IncomingOffer'>) {
  const t = useTheme();
  const job = useJobStore((s) => s.job);
  const accept = useJobStore((s) => s.accept);
  const decline = useJobStore((s) => s.decline);
  const [left, setLeft] = useState(COUNTDOWN);

  // Countdown — auto-pass to the next engineer at zero (dispatch model).
  useEffect(() => {
    if (!job) return;
    const tick = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(tick);
  }, [job]);

  useEffect(() => {
    if (left <= 0) {
      decline();
      navigation.goBack();
    }
  }, [left, decline, navigation]);

  if (!job) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} />;
  }

  const onAccept = () => {
    accept();
    navigation.replace('Navigate');
  };
  const onDecline = () => {
    decline();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: 20, gap: 16, justifyContent: 'center' }}>
        {/* Countdown */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ color: t.colors.primary, fontSize: 48, fontWeight: '800' }}>{left}s</Text>
          <View style={{ width: '60%' }}><ProgressBar value={left / COUNTDOWN} /></View>
          <Text style={{ color: t.colors.muted }}>Job auto-passes if you don't accept</Text>
        </View>

        {/* Customer mini-card */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.colors.primary, fontWeight: '800' }}>{job.customerName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{job.customerName}</Text>
            <Text style={{ color: t.colors.muted, fontSize: 13 }}>{job.customerRating}★ · {job.customerJobs} jobs</Text>
          </View>
        </Card>

        {/* Job details */}
        <Card style={{ gap: 8 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '800', fontSize: 18 }}>{job.serviceName}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.muted }}>Payout</Text>
            <Text style={{ color: t.colors.ink, fontWeight: '700' }}>₹{job.payout.toLocaleString('en-IN')}</Text>
          </View>
          {job.peakBonus > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <StatusBadge tone="progress" label="PEAK-HOUR BONUS" />
              <Text style={{ color: t.colors.signal, fontWeight: '700' }}>+₹{job.peakBonus}</Text>
            </View>
          ) : null}
          <Text style={{ color: t.colors.muted }}>{job.address} · {job.distanceKm} km · {job.etaMin} min</Text>
          <View style={{ height: 1, backgroundColor: t.colors.line, marginVertical: 4 }} />
          {job.tasks.map((task) => <Text key={task} style={{ color: t.colors.ink }}>• {task}</Text>)}
        </Card>

        <Button title="Accept job" block onPress={onAccept} />
        <Button title="Decline" variant="ghost" block onPress={onDecline} />
      </View>
    </SafeAreaView>
  );
}
