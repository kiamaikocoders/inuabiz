import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCheck, CreditCard, Package, Receipt, Settings2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { vendorNotifications, type NotificationItem } from "@/lib/mock-data";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — InuaBiz" },
      {
        name: "description",
        content:
          "Real-time sale, low-stock, credit and subscription alerts, plus per-channel preferences for email, SMS, WhatsApp and sound.",
      },
      { property: "og:title", content: "InuaBiz notifications" },
      { property: "og:description", content: "Real-time alerts and channel preferences." },
    ],
  }),
  component: Notifications,
});

const iconFor = (t: NotificationItem["type"]) =>
  t === "SALE" ? Receipt : t === "STOCK_LOW" ? Package : t === "CREDIT" ? CreditCard : t === "SUBSCRIPTION" ? Wallet : Bell;

const priorityStyle: Record<NotificationItem["priority"], string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-primary-soft text-primary",
  HIGH: "bg-warning/25 text-warning-foreground",
  CRITICAL: "bg-destructive/15 text-destructive",
};

function Notifications() {
  const [items, setItems] = useState(vendorNotifications);
  const [tab, setTab] = useState("all");

  const rows = items.filter((n) => (tab === "unread" ? !n.read : true));

  return (
    <AppShell
      title="Notifications"
      description="Everything happening in your shop, in real time"
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
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-card p-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({items.filter((n) => !n.read).length})
              </TabsTrigger>
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
                    <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                      {n.message}
                    </p>
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
              <p className="text-muted-foreground py-12 text-center text-sm">You're all caught up.</p>
            )}
          </div>
        </div>

        <div className="surface-card h-fit p-5">
          <p className="inline-flex items-center gap-2 font-semibold">
            <Settings2 className="text-primary size-4" /> Preferences
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose how each alert reaches you.
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["In-app bell", "Instant badge updates on every event", true],
              ["Sound at POS", "Chime when a payment completes", true],
              ["Email receipts", "Branded transactional emails", true],
              ["SMS alerts", "Critical payment and subscription alerts", false],
              ["WhatsApp reminders", "Automated debt reminders to customers", true],
              ["Daily digest", "One evening summary instead of live stock pings", false],
            ].map(([label, hint, on]) => (
              <div key={label as string} className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm">{label as string}</Label>
                  <p className="text-muted-foreground text-xs">{hint as string}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
