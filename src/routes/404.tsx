import { createFileRoute } from "@tanstack/react-router";
import { NotFoundStatus } from "@/components/status/screens";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/404")({
  head: () => privateHead("Page not found — InuaBiz"),
  component: NotFoundStatus,
});
