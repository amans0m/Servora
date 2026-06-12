import * as Sentry from '@sentry/node';

/**
 * Initialise Sentry with PII scrubbing (§A9). No-op when SENTRY_DSN is unset,
 * so local dev runs without it. `sendDefaultPii: false` plus a beforeSend hook
 * strips request headers/cookies/body and IP before any event leaves the box.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Scrub anything that could carry tokens / PII.
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.query_string;
      }
      delete event.user; // we never need end-user identity in error events
      return event;
    },
  });
  return true;
}

export { Sentry };
