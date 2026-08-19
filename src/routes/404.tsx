import { createFileRoute } from "@tanstack/react-router";
import { NotFoundStatus } from "@/components/status/screens";

export const Route = createFileRoute("/404")({
  head: () => ({
    meta: [{ title: "Page not found — InuaBiz" }],
  }),
  component: NotFoundStatus,
});
