import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { apiClient } from './api';
import { config } from './config';

/**
 * Register for FCM/APNs push via Expo (job offers, OTP, payout alerts — §4).
 * No-op on web. The token is sent to the backend (never a third-party key on
 * the client — B1).
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!config.useMocks) {
      await apiClient.post('/notifications/token', { token }).catch(() => {});
    }
    return token;
  } catch {
    return null;
  }
}
