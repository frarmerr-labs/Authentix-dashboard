import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://562a5d5c947ffa92579035127cffcd56@o4511126373990400.ingest.us.sentry.io/4511126375628800",

  tracesSampleRate: 0.1,
});
