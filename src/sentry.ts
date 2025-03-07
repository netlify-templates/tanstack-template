import * as Sentry from '@sentry/react';

export function initSentry() {
  // Skip Sentry initialization if DSN is not defined
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log('Sentry DSN not found. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}