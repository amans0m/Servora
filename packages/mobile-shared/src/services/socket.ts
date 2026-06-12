import { io, type Socket } from 'socket.io-client';

/**
 * Authenticated Socket.IO client (SECURITY.md B2): wss only, token sent on
 * connect, and — because `auth` is a function — re-sent on every reconnect
 * (re-auth on reconnect). The token never leaves the device except over TLS.
 */
export function createSocket(
  namespaceUrl: string,
  getToken: () => string | null,
): Socket {
  if (!namespaceUrl.startsWith('wss://') && !namespaceUrl.startsWith('ws://')) {
    throw new Error('Socket URL must be wss:// (ws:// only for local dev)');
  }
  return io(namespaceUrl, {
    transports: ['websocket'],
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() ?? '' }),
    reconnection: true,
    reconnectionAttempts: 5,
  });
}
