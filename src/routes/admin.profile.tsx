import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/AdminShell";
import { AccountProfileCard } from "@/components/app/AccountProfileCard";
import { useIdentity } from "@/lib/identity";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [{ title: "Operator profile — InuaBiz admin" }],
  }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const identity = useIdentity("admin");

  return (
    <AdminShell title="Profile" description="Your operator account">
      <AccountProfileCard identity={identity} kind="admin" />
    </AdminShell>
  );
}
