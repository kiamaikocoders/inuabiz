import { createFileRoute, redirect } from "@tanstack/react-router";

/** Companion APK lives in vendor Settings — keep this path so old links still land there. */
export const Route = createFileRoute("/companion")({
  beforeLoad: () => {
    throw redirect({ to: "/app/settings" });
  },
  component: () => null,
});
