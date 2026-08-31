import * as Sentry from "@sentry/tanstackstart-react";

const isProd = import.meta.env.PROD;

Sentry.init({
  dsn:
    import.meta.env["VITE_SENTRY_DSN"] ||
    "https://93d04e4641b8be3b26f9c0599418229e@o4511999706398720.ingest.de.sentry.io/4511999720030288",
  enabled: isProd,
  environment: import.meta.env.MODE,
  beforeSend(event) {
    if (!isProd) return null;
    const message = event.exception?.values?.[0]?.value ?? event.message ?? "";
    if (
      typeof message === "string" &&
      (message.includes("Sentry Example") ||
        message.includes("Invalid hook call") ||
        message.includes("useContext"))
    ) {
      return null;
    }
    return event;
  },
  integrations: isProd ? [Sentry.replayIntegration()] : [],
  tracesSampleRate: isProd ? 0.2 : 0,
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: isProd ? 1.0 : 0,
});
