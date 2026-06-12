import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ProgressBar, StatusBadge, useTheme } from '@servora/mobile-shared';

import { TIERS } from '../types';

const BONUSES = [
  { id: 'weekend', label: 'Weekend push', reward: '+10% payout' },
  { id: 'peak', label: 'Peak-hour top-up', reward: '+₹150/job' },
  { id: 'fivestar', label: '5-star streak', reward: '₹500 bonus' },
  { id: 'referral', label: 'Refer an engineer', reward: '₹1,000' },
];

export function RewardsScreen() {
  const t = useTheme();
  const currentTier = 'Gold';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: t.colors.ink, fontSize: 24, fontWeight: '800' }}>Rewards</Text>

        {/* Active quest */}
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Active quest</Text>
            <StatusBadge tone="progress" label="₹800" />
          </View>
          <Text style={{ color: t.colors.muted, fontSize: 13 }}>Complete 12 jobs this week · 8 of 12</Text>
          <ProgressBar value={8 / 12} color={t.colors.signal} />
        </Card>

        {/* Streak + tier */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>🔥</Text>
            <Text style={{ color: t.colors.ink, fontWeight: '800', marginTop: 4 }}>6-day</Text>
            <Text style={{ color: t.colors.muted, fontSize: 12 }}>login streak</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <Text style={{ color: t.colors.ink, fontWeight: '800', marginTop: 4 }}>{currentTier}</Text>
            <Text style={{ color: t.colors.muted, fontSize: 12 }}>18% commission</Text>
          </Card>
        </View>

        {/* Tier progress */}
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Gold → Platinum</Text>
            <StatusBadge tone="done" label="15% COMMISSION" />
          </View>
          <ProgressBar value={0.7} />
          <Text style={{ color: t.colors.muted, fontSize: 12 }}>Higher tier = lower commission + priority dispatch.</Text>
        </Card>

        {/* Available bonuses */}
        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Available bonuses</Text>
        {BONUSES.map((b) => (
          <Card key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.ink }}>{b.label}</Text>
            <Text style={{ color: t.colors.signal, fontWeight: '700' }}>{b.reward}</Text>
          </Card>
        ))}

        {/* Tier table */}
        <Text style={{ color: t.colors.ink, fontWeight: '700' }}>Tiers</Text>
        <Card style={{ gap: 6 }}>
          {TIERS.map((tier) => (
            <View key={tier.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ color: t.colors.ink, fontWeight: '600' }}>{tier.name}</Text>
              <Text style={{ color: t.colors.muted }}>{tier.commission}% · {tier.perks}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
