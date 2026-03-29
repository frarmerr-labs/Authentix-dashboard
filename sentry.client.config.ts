import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://562a5d5c947ffa92579035127cffcd56@o4511126373990400.ingest.us.sentry.io/4511126375628800",

  // Replay only on errors (100%) and 1% of general sessions
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Strip auth headers from breadcrumbs before sending
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }
    return event;
  },
});
