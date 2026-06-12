import { createSocket, useSessionStore } from '@servora/mobile-shared';

import { config } from './config';

/** Authenticated live-tracking socket (§7) — wss, token re-sent on reconnect. */
export const trackingSocket = () =>
  createSocket(`${config.socketUrl}/tracking`, () => useSessionStore.getState().accessToken);
