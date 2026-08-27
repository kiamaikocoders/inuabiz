import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireVendorWorkspace } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => requireVendorWorkspace(),
  component: () => <Outlet />,
});
