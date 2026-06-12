import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Token storage (SECURITY.md B1). Native uses the iOS Keychain / Android
 * Keystore via expo-secure-store — NEVER AsyncStorage. On web (Expo Web)
 * expo-secure-store is unavailable, so tokens are kept in memory only
 * (never localStorage/sessionStorage). Cleared on logout.
 */
const memory = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export async function secureSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    memory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function secureGet(key: string): Promise<string | null> {
  if (isWeb) return memory.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function secureDelete(key: string): Promise<void> {
  if (isWeb) {
    memory.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
