import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireVendorWorkspace } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  beforeLoad: () => requireVendorWorkspace(),
  component: () => <Outlet />,
});
