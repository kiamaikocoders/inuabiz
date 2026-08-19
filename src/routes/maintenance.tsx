import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceStatus } from "@/components/status/screens";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [{ title: "We'll be right back — InuaBiz" }],
  }),
  component: MaintenanceStatus,
});
