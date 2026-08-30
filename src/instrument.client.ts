import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn:
    import.meta.env["VITE_SENTRY_DSN"] ||
    "https://93d04e4641b8be3b26f9c0599418229e@o4511999706398720.ingest.de.sentry.io/4511999720030288",
  environment: import.meta.env.MODE,
  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
