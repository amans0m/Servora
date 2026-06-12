import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, Chip, StarRating, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useJobStore } from '../store/job.store';
import { fieldStyle } from '../components/field';

const TAGS = ['Clear requirements', 'Cooperative', 'Safe site', 'Prompt OTP'];

export function RateCustomerScreen({ navigation }: AppScreenProps<'RateCustomer'>) {
  const t = useTheme();
  const finish = useJobStore((s) => s.finish);
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  const done = () => {
    finish();
    navigation.navigate('Tabs');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Rate the customer" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>How was the customer?</Text>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>Visible to admin only — helps flag difficult sites.</Text>
          <StarRating value={stars} onChange={setStars} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TAGS.map((tag) => (
              <Chip key={tag} label={tag} selected={!!tags[tag]} onPress={() => setTags((s) => ({ ...s, [tag]: !s[tag] }))} />
            ))}
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder="Notes (optional)" placeholderTextColor={t.colors.muted} multiline style={[fieldStyle(t), { height: 80, textAlignVertical: 'top' }]} />
        </Card>
        <Button title="Submit rating" block onPress={done} />
        <Button title="Skip" variant="ghost" block onPress={done} />
      </ScrollView>
    </SafeAreaView>
  );
}
