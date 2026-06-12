import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useBookingStore } from '../store/booking.store';
import { fieldStyle } from '../components/field';

export function CustomRequestScreen({ route, navigation }: AppScreenProps<'CustomRequest'>) {
  const t = useTheme();
  const field = fieldStyle(t);
  const createCustom = useBookingStore((s) => s.createCustom);
  const [category] = useState(route.params?.categoryName ?? 'Custom');
  const [description, setDescription] = useState('');

  const submit = () => {
    createCustom({ categoryName: category, description, address: 'HQ — 12 MG Road, Bengaluru' });
    navigation.navigate('Tabs'); // lands on the Bookings tab list (status QUOTE)
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Custom request" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Category</Text>
        <View style={[fieldStyle(t), { justifyContent: 'center' }]}>
          <Text style={{ color: t.colors.ink }}>{category}</Text>
        </View>

        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Describe the problem</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Site survey for a 3-floor office network…"
          placeholderTextColor={t.colors.muted}
          multiline
          style={[field, { height: 120, textAlignVertical: 'top' }]}
        />

        <Text style={{ color: t.colors.muted, fontSize: 12 }}>
          An admin reviews custom requests and sends a price quote before you book. No charge now.
        </Text>

        <Button title="Submit request" block disabled={description.length < 10} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}
