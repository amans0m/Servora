import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, Card, StarRating, useTheme } from '@servora/mobile-shared';

import type { AppScreenProps } from '../navigation/types';
import { useService } from '../features/catalog';

export function ServiceDetailScreen({ route, navigation }: AppScreenProps<'ServiceDetail'>) {
  const t = useTheme();
  const { data: service } = useService(route.params.serviceId);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  if (!service) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <AppBar title="Service" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const addonTotal = service.addons.filter((a) => selected[a.id]).reduce((s, a) => s + a.price, 0);
  const total = service.price + addonTotal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title={service.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <Text style={{ color: t.colors.ink, fontSize: 20, fontWeight: '800' }}>{service.name}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 4 }}>{service.summary}</Text>
          <Text style={{ color: t.colors.ink, marginTop: 10, fontWeight: '700' }}>
            From ₹{service.price.toLocaleString('en-IN')} · {service.rating}★ · {service.engineersNearby} engineers nearby
          </Text>
        </Card>

        <Section title="What's included">
          {service.included.map((i) => (
            <Text key={i} style={{ color: t.colors.ink, marginVertical: 2 }}>✓ {i}</Text>
          ))}
        </Section>

        {service.addons.length > 0 ? (
          <Section title="Add-ons">
            {service.addons.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: t.colors.ink }}>{selected[a.id] ? '☑' : '☐'} {a.name}</Text>
                <Text style={{ color: t.colors.muted }}>+₹{a.price.toLocaleString('en-IN')}</Text>
              </Pressable>
            ))}
          </Section>
        ) : null}

        <Section title="Customer reviews">
          {service.reviews.map((r) => (
            <View key={r.id} style={{ paddingVertical: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: t.colors.ink, fontWeight: '600' }}>{r.author}</Text>
                <StarRating value={r.stars} size={14} readonly />
              </View>
              <Text style={{ color: t.colors.muted }}>{r.text}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.colors.line, backgroundColor: t.colors.surface }}>
        <Button
          title={`Book — ₹${total.toLocaleString('en-IN')}`}
          block
          onPress={() =>
            navigation.navigate('ConfirmBooking', {
              serviceId: service.id,
              addonIds: service.addons.filter((a) => selected[a.id]).map((a) => a.id),
            })
          }
        />
      </View>
    </SafeAreaView>
  );

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card>
        <Text style={{ color: t.colors.ink, fontWeight: '700', marginBottom: 6 }}>{title}</Text>
        {children}
      </Card>
    );
  }
}
