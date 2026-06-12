import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSessionStore, useTheme } from '@servora/mobile-shared';

import type { AppStackParamList, AuthStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DesignSystemScreen } from '../screens/DesignSystemScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { CustomRequestScreen } from '../screens/CustomRequestScreen';
import { ConfirmBookingScreen } from '../screens/ConfirmBookingScreen';
import { LiveTrackingScreen } from '../screens/LiveTrackingScreen';
import { ChangeEngineerScreen } from '../screens/ChangeEngineerScreen';
import { RescheduleScreen } from '../screens/RescheduleScreen';
import { CompletePayScreen } from '../screens/CompletePayScreen';
import { RateJobScreen } from '../screens/RateJobScreen';

const Auth = createNativeStackNavigator<AuthStackParamList>();
const App = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, color }: { icon: string; color: string }) {
  // Emoji glyphs keep the tab bar dependency-free for Phase 2.
  return <Text style={{ fontSize: 18, color }}>{icon}</Text>;
}

function Tabs() {
  const t = useTheme();
  const icons: Record<string, string> = { Home: '🏠', Bookings: '🧾', Offers: '🎁', Profile: '👤' };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,
        tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.line },
        tabBarIcon: ({ color }) => <TabIcon icon={icons[route.name] ?? '•'} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Offers" component={OffersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <App.Navigator screenOptions={{ headerShown: false }}>
      <App.Screen name="Tabs" component={Tabs} />
      <App.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <App.Screen name="CustomRequest" component={CustomRequestScreen} />
      <App.Screen name="ConfirmBooking" component={ConfirmBookingScreen} />
      <App.Screen name="LiveTracking" component={LiveTrackingScreen} />
      <App.Screen name="ChangeEngineer" component={ChangeEngineerScreen} />
      <App.Screen name="Reschedule" component={RescheduleScreen} />
      <App.Screen name="CompletePay" component={CompletePayScreen} />
      <App.Screen name="RateJob" component={RateJobScreen} />
    </App.Navigator>
  );
}

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
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
