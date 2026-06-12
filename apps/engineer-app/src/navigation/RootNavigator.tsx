import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSessionStore, useTheme } from '@servora/mobile-shared';

import type { AppStackParamList, AuthStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { DesignSystemScreen } from '../screens/DesignSystemScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { IncomingOfferScreen } from '../screens/IncomingOfferScreen';
import { NavigateScreen } from '../screens/NavigateScreen';
import { StartJobScreen } from '../screens/StartJobScreen';
import { JobInProgressScreen } from '../screens/JobInProgressScreen';
import { CloseJobScreen } from '../screens/CloseJobScreen';
import { RateCustomerScreen } from '../screens/RateCustomerScreen';

const Auth = createNativeStackNavigator<AuthStackParamList>();
const App = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator();

function Tabs() {
  const t = useTheme();
  const icons: Record<string, string> = { Home: '🏠', Earnings: '💰', Rewards: '🎯', Profile: '👤' };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,
        tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.line },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{icons[route.name] ?? '•'}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <App.Navigator screenOptions={{ headerShown: false }}>
      <App.Screen name="Tabs" component={Tabs} />
      {/* Incoming offer is presented modally over the tabs. */}
      <App.Screen name="IncomingOffer" component={IncomingOfferScreen} options={{ presentation: 'fullScreenModal' }} />
      <App.Screen name="Navigate" component={NavigateScreen} />
      <App.Screen name="StartJob" component={StartJobScreen} />
      <App.Screen name="JobInProgress" component={JobInProgressScreen} />
      <App.Screen name="CloseJob" component={CloseJobScreen} />
      <App.Screen name="RateCustomer" component={RateCustomerScreen} />
    </App.Navigator>
  );
}

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="DesignSystem" component={DesignSystemScreen} />
    </Auth.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const accessToken = useSessionStore((s) => s.accessToken);
  const hydrated = useSessionStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }
  return accessToken ? <AppStack /> : <AuthStack />;
}
