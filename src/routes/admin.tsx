import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requireSuperAdmin(),
  component: () => <Outlet />,
});
