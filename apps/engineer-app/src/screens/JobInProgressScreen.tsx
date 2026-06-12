import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';

export function JobInProgressScreen({ navigation }: AppScreenProps<'JobInProgress'>) {
  const t = useTheme();
  const job = useJobStore((s) => s.job);
  const addProof = useJobStore((s) => s.addProof);
  const completeWork = useJobStore((s) => s.completeWork);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const proofCount = job?.proof.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Job in progress" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 8 }}>Task checklist</Text>
          {(job?.tasks ?? []).map((task, i) => (
            <Text key={task} onPress={() => setDone((d) => ({ ...d, [i]: !d[i] }))} style={{ color: t.colors.ink, paddingVertical: 6 }}>
              {done[i] ? '☑' : '☐'} {task}
            </Text>
          ))}
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Proof of work</Text>
          <Text style={{ color: t.colors.muted, fontSize: 13 }}>Evidence required before closing.</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {(job?.proof ?? []).map((p) => (
              <View key={p} style={{ width: 70, height: 70, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>🖼️</Text>
              </View>
            ))}
            <Button title="Add photo" variant="ghost" onPress={addProof} />
          </View>
        </Card>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.colors.line, backgroundColor: t.colors.surface }}>
        <Button
          title="Complete job"
          block
          disabled={proofCount === 0}
          onPress={() => { completeWork(); navigation.replace('CloseJob'); }}
        />
      </View>
    </SafeAreaView>
  );
}
