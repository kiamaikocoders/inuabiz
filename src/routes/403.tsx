import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenStatus } from "@/components/status/screens";

export const Route = createFileRoute("/403")({
  head: () => ({
    meta: [{ title: "Access denied — InuaBiz" }],
  }),
  component: ForbiddenStatus,
});
