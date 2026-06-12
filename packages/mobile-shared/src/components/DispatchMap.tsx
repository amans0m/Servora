import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface MapMarker {
  id: string;
  label?: string;
  latitude?: number;
  longitude?: number;
  distanceM?: number;
}

export interface DispatchMapProps {
  markers?: MapMarker[];
  height?: number;
  center?: { latitude: number; longitude: number };
}

/**
 * Default (Expo Web) implementation — a stylised placeholder. Native devices
 * load `DispatchMap.native.tsx` (react-native-maps / Google) via Metro's
 * platform resolution. Same props on both.
 */
export function DispatchMap({ markers = [], height = 220 }: DispatchMapProps) {
  const t = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: t.colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text style={{ fontSize: 28 }}>📍</Text>
      <Text style={{ color: t.colors.muted, marginTop: 6, fontSize: 12 }}>
        {markers.length} engineer{markers.length === 1 ? '' : 's'} nearby
      </Text>
    </View>
  );
}
