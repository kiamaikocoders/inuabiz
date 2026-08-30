import { createFileRoute } from "@tanstack/react-router";

/** Super-admin / Sentry verify route — throws on GET so server errors appear in Sentry. */
export const Route = createFileRoute("/api/sentry-example")({
  server: {
    handlers: {
      GET: () => {
        throw new Error("Sentry Example Route Error");
      },
    },
  },
});
