import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/**
 * Hides app content in the app-switcher / recent-apps preview (SECURITY.md B5).
 * When the app goes inactive/background, an opaque cover is shown so sensitive
 * screens don't leak into the OS snapshot. Mount once at the app root.
 */
export function AppPrivacyOverlay() {
  const t = useTheme();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onChange = (state: AppStateStatus) => setHidden(state !== 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  if (!hidden) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>Servora</Text>
    </View>
  );
}
