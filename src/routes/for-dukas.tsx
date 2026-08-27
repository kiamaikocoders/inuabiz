import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/for-dukas")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
