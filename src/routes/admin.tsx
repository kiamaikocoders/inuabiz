import { createFileRoute, Outlet } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { requireSuperAdmin } = await import("@/lib/auth");
    await requireSuperAdmin();
  },
  head: () => privateHead("InuaBiz — Admin"),
  component: () => <Outlet />,
});
