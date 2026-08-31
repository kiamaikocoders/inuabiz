import { createFileRoute } from "@tanstack/react-router";

/** Dev-only Sentry verify route — never throws in production. */
export const Route = createFileRoute("/api/sentry-example")({
  server: {
    handlers: {
      GET: () => {
        if (import.meta.env.PROD) {
          return new Response("Not found", { status: 404 });
        }
        throw new Error("Sentry Example Route Error");
      },
    },
  },
});
