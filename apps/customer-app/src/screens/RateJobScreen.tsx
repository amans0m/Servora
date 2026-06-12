import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, Chip, StarRating, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import { fieldStyle } from '../components/field';

const ENG_TAGS = ['Professional', 'On time', 'Skilled', 'Polite'];
const PLATFORM_TAGS = ['Easy booking', 'Fair price', 'Good support'];

export function RateJobScreen({ route, navigation }: AppScreenProps<'RateJob'>) {
  const t = useTheme();
  const rate = useBookingStore((s) => s.rate);
  const [engStars, setEngStars] = useState(5);
  const [platformStars, setPlatformStars] = useState(5);
  const [engTags, setEngTags] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState('');

  const submit = () => {
    rate(route.params.bookingId);
    navigation.navigate('Tabs');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Rate the job" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Engineer rating — public */}
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Rate your engineer</Text>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>Public — shows on their profile.</Text>
          <StarRating value={engStars} onChange={setEngStars} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ENG_TAGS.map((tag) => (
              <Chip key={tag} label={tag} selected={!!engTags[tag]} onPress={() => setEngTags((s) => ({ ...s, [tag]: !s[tag] }))} />
            ))}
          </View>
          <TextInput value={review} onChangeText={setReview} placeholder="Write a review (optional)" placeholderTextColor={t.colors.muted} style={[fieldStyle(t), { height: 80, textAlignVertical: 'top' }]} multiline />
        </Card>

        {/* Platform rating — internal */}
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Rate Servora</Text>
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>Internal — helps us improve.</Text>
          <StarRating value={platformStars} onChange={setPlatformStars} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORM_TAGS.map((tag) => <Chip key={tag} label={tag} />)}
          </View>
        </Card>

        <Button title="Submit ratings" block onPress={submit} />
        <Button title="Skip for now" variant="ghost" block onPress={() => navigation.navigate('Tabs')} />
      </ScrollView>
    </SafeAreaView>
  );
}
