import { createFileRoute, Outlet } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { requireVendorWorkspace } = await import("@/lib/auth");
    await requireVendorWorkspace();
  },
  head: () => privateHead("InuaBiz — Vendor app"),
  component: () => <Outlet />,
});
