import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AccountProfileCard } from "@/components/app/AccountProfileCard";
import { useIdentity } from "@/lib/identity";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — InuaBiz" },
      {
        name: "description",
        content: "Manage your InuaBiz account name, phone and sign-out options.",
      },
    ],
  }),
  component: VendorProfilePage,
});

function VendorProfilePage() {
  const identity = useIdentity("vendor");

  return (
    <AppShell title="Profile" description="Your account, not the shop">
      <AccountProfileCard identity={identity} kind="vendor" />
    </AppShell>
  );
}
