import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Block screenshots / screen recording while a sensitive screen is mounted
 * (SECURITY.md B5 — OTP & payment screens). No-op on web.
 */
export function useScreenCaptureGuard() {
  useEffect(() => {
    let active = true;
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      active = false;
      void active;
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);
}
