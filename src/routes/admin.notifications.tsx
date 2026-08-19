import { createFileRoute } from "@tanstack/react-router";
import { NotificationsCommandCenter } from "@/components/admin/NotificationsCommandCenter";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Admin notifications — InuaBiz" },
      {
        name: "description",
        content:
          "Command-centre activity feed for unclaimed M-Pesa, vendor sign-ups, subscriptions, webhook exceptions and platform health.",
      },
      { property: "og:title", content: "InuaBiz admin notifications" },
      { property: "og:description", content: "Timed activity feed for platform alerts." },
    ],
  }),
  component: NotificationsCommandCenter,
});
