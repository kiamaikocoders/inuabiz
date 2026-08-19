import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/broadcasts")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/communications" });
  },
  component: () => null,
});
