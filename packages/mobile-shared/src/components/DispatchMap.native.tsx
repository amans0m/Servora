import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTheme } from '../theme/ThemeProvider';
import type { DispatchMapProps } from './DispatchMap';

const FALLBACK = { latitude: 12.9759, longitude: 77.6063 };

/**
 * Native map (react-native-maps / Google) — live tracking & dispatch (§7).
 * Loaded automatically on iOS/Android via Metro platform resolution.
 */
export function DispatchMap({ markers = [], height = 220, center }: DispatchMapProps) {
  const t = useTheme();
  const origin = center ?? FALLBACK;
  return (
    <View style={{ height, borderRadius: t.radius.md, overflow: 'hidden' }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{ ...origin, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
      >
        {markers
          .filter((m) => m.latitude != null && m.longitude != null)
          .map((m) => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.latitude as number, longitude: m.longitude as number }}
              title={m.label}
            />
          ))}
      </MapView>
    </View>
  );
}
