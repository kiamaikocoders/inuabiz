import * as Sentry from "@sentry/tanstackstart-react";

const dsn =
  process.env["SENTRY_DSN"] ||
  process.env["VITE_SENTRY_DSN"] ||
  "https://93d04e4641b8be3b26f9c0599418229e@o4511999706398720.ingest.de.sentry.io/4511999720030288";

const isProd = (process.env["NODE_ENV"] ?? "production") === "production";

Sentry.init({
  dsn,
  enabled: isProd,
  environment: process.env["NODE_ENV"] ?? "production",
  beforeSend(event) {
    if (!isProd) return null;
    const message = event.exception?.values?.[0]?.value ?? event.message ?? "";
    if (typeof message === "string" && message.includes("Sentry Example")) {
      return null;
    }
    return event;
  },
  tracesSampleRate: isProd ? 0.2 : 0,
});
