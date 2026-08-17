import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCheck, ShieldAlert, Store, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { adminNotifications, type NotificationItem } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Admin notifications — InuaBiz" },
      {
        name: "description",
        content:
          "Platform alerts for new vendor registrations, subscription payments, webhook exceptions and unclaimed transactions.",
      },
      { property: "og:title", content: "InuaBiz admin notifications" },
      { property: "og:description", content: "Registrations, payments and webhook exceptions." },
    ],
  }),
  component: AdminNotifications,
});

const iconFor = (t: NotificationItem["type"]) =>
  t === "SUBSCRIPTION" ? Wallet : t === "SALE" ? Store : t === "SYSTEM" ? ShieldAlert : Bell;

const priorityStyle: Record<NotificationItem["priority"], string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-primary-soft text-primary",
  HIGH: "bg-warning/25 text-warning-foreground",
  CRITICAL: "bg-destructive/15 text-destructive",
};

function AdminNotifications() {
  const [items, setItems] = useState(adminNotifications);
  const [tab, setTab] = useState("all");

  const rows = items.filter((n) =>
    tab === "unread" ? !n.read : tab === "critical" ? n.priority === "CRITICAL" || n.priority === "HIGH" : true,
  );

  return (
    <AdminShell
      title="Notifications"
      description="Platform-wide alerts and exceptions"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setItems((i) => i.map((n) => ({ ...n, read: true })));
            toast.success("All marked as read");
          }}
        >
          <CheckCheck className="mr-2 size-4" /> Mark all read
        </Button>
      }
    >
      <div className="surface-card max-w-3xl p-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread ({items.filter((n) => !n.read).length})</TabsTrigger>
            <TabsTrigger value="critical">Needs action</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 space-y-2">
          {rows.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <button
                key={n.id}
                onClick={() =>
                  setItems((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                }
                className={cn(
                  "flex w-full gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  n.read ? "border-border bg-card" : "border-primary/25 bg-primary-soft/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    priorityStyle[n.priority],
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <span className="text-muted-foreground shrink-0 text-[11px]">{n.time}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{n.message}</p>
                  <div className="mt-2 flex gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {n.type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {n.priority}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="text-muted-foreground py-12 text-center text-sm">Nothing here.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
