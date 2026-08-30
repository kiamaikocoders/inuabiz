import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenStatus } from "@/components/status/screens";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/403")({
  head: () => privateHead("Access denied — InuaBiz"),
  component: ForbiddenStatus,
});
