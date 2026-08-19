import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthSession } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  beforeLoad: () => requireAuthSession(),
  component: () => <Outlet />,
});
