import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireSuperAdmin(),
  component: () => <Outlet />,
});
