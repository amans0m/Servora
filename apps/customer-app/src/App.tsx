import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppPrivacyOverlay, ThemeProvider, useSessionStore, useThemeStore } from '@servora/mobile-shared';
import { View } from 'react-native';

import { RootNavigator } from './navigation/RootNavigator';
import { linking } from './navigation/linking';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Themed() {
  const mode = useThemeStore((s) => s.mode);
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer theme={mode === 'dark' ? DarkTheme : DefaultTheme} linking={linking}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
      {/* Hides content in the app switcher; renders only when backgrounded (B5). */}
      <AppPrivacyOverlay />
    </View>
  );
}

export default function App() {
  const hydrate = useSessionStore((s) => s.hydrate);
  // Load persisted session from secure storage on boot (B1).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Themed />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
