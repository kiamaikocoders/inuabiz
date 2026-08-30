import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceStatus } from "@/components/status/screens";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/maintenance")({
  head: () => privateHead("We'll be right back — InuaBiz"),
  component: MaintenanceStatus,
});
