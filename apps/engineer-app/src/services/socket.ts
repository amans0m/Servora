import { createSocket, useSessionStore } from '@servora/mobile-shared';

import { config } from './config';

/** Authenticated dispatch socket (§7) — receives ranked job offers. */
export const dispatchSocket = () =>
  createSocket(`${config.socketUrl}/dispatch`, () => useSessionStore.getState().accessToken);
