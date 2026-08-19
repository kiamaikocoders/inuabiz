import { createFileRoute } from "@tanstack/react-router";
import { CommunicationsPanel } from "@/components/admin/CommunicationsPanel";

export const Route = createFileRoute("/admin/communications")({
  head: () => ({
    meta: [
      { title: "Communications — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Broadcast banners, preview the 17 InuaBiz email templates, inspect delivery logs and configure the mail provider.",
      },
      { property: "og:title", content: "InuaBiz communications" },
      {
        property: "og:description",
        content: "Broadcasts, Figma email templates, delivery log and Resend settings.",
      },
    ],
  }),
  component: CommunicationsPanel,
});
