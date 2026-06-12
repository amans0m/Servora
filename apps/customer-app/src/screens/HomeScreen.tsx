import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, useTheme } from '@servora/mobile-shared';

import type { AppStackParamList } from '../navigation/types';
import { useCategories, usePopularServices } from '../features/catalog';
import { fieldStyle } from '../components/field';

export function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const categories = useCategories();
  const popular = usePopularServices();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={{ color: t.colors.muted }}>Welcome back</Text>
          <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Acme Technologies</Text>
        </View>
        <TextInput placeholder="Search services…" placeholderTextColor={t.colors.muted} style={fieldStyle(t)} />

        {/* Offer banner */}
        <Pressable onPress={() => nav.navigate('Tabs')}>
          <View style={{ backgroundColor: t.colors.signalSoft, borderRadius: t.radius.md, padding: 16 }}>
            <Text style={{ color: t.colors.signal, fontWeight: '800', fontSize: 16 }}>SAVE20</Text>
            <Text style={{ color: t.colors.ink, marginTop: 2 }}>20% off your next booking</Text>
          </View>
        </Pressable>

        {/* Category grid */}
        <Text style={{ color: t.colors.ink, fontSize: 16, fontWeight: '700' }}>Categories</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                c.custom
                  ? nav.navigate('CustomRequest', { categoryName: c.name })
                  : nav.navigate('Tabs')
              }
              style={{ width: '22%' }}
            >
              <Card style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={{ color: t.colors.ink, fontSize: 11, marginTop: 6 }}>{c.name}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Popular services */}
        <Text style={{ color: t.colors.ink, fontSize: 16, fontWeight: '700' }}>Popular services</Text>
        <View style={{ gap: 10 }}>
          {(popular.data ?? []).map((s) => (
            <Pressable key={s.id} onPress={() => nav.navigate('ServiceDetail', { serviceId: s.id })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.colors.ink, fontWeight: '700' }}>{s.name}</Text>
                  <Text style={{ color: t.colors.muted, marginTop: 2, fontSize: 13 }}>
                    ₹{s.price.toLocaleString('en-IN')} · {s.rating}★ · {s.engineersNearby} nearby
                  </Text>
                </View>
                <Text style={{ color: t.colors.primary, fontSize: 22 }}>›</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
