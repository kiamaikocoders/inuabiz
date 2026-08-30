import * as Sentry from "@sentry/tanstackstart-react";

const dsn =
  process.env["SENTRY_DSN"] ||
  process.env["VITE_SENTRY_DSN"] ||
  "https://93d04e4641b8be3b26f9c0599418229e@o4511999706398720.ingest.de.sentry.io/4511999720030288";

Sentry.init({
  dsn,
  environment: process.env["NODE_ENV"] ?? "production",
  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },
  tracesSampleRate: 1.0,
});
