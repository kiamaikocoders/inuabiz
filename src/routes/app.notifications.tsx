import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  fetchNotificationPrefs,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPrefs,
} from "@/lib/ops";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useState } from "react";
import { useGhost } from "@/lib/ghost";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — InuaBiz" }],
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
  const queryClient = useQueryClient();
  const ghost = useGhost();
  const [tab, setTab] = useState("all");
  const { data: live } = useQuery({
    queryKey: ["notifications", ghost?.tenantId ?? "self"],
    queryFn: fetchNotifications,
    enabled: isSupabaseConfigured(),
  });
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: fetchNotificationPrefs,
    enabled: isSupabaseConfigured(),
  });
  const items = live ?? vendorNotifications;
  const rows = items.filter((n) => (tab === "unread" ? !n.read : true));

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel("notifications-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [queryClient]);

  const togglePref = (key: "channel_in_app" | "channel_email" | "channel_sms" | "channel_whatsapp" | "channel_sound", value: boolean) => {
    void saveNotificationPrefs({ [key]: value })
      .then(() => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not save"));
  };

  return (
    <AppShell
      title="Notifications"
      description="Everything happening in your shop, in real time"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void markAllNotificationsRead().then(() =>
              queryClient.invalidateQueries({ queryKey: ["notifications"] }),
            );
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
              <TabsTrigger value="unread">Unread ({items.filter((n) => !n.read).length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4 space-y-2">
            {rows.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    void markNotificationRead(n.id).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
                    );
                  }}
                  className={cn(
                    "flex w-full gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    n.read ? "border-border bg-card" : "border-primary/25 bg-primary-soft/50",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", priorityStyle[n.priority])}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      <span className="text-muted-foreground shrink-0 text-[11px]">{n.time}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{n.message}</p>
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
          <div className="mt-5 space-y-4">
            {(
              [
                ["channel_in_app", "In-app bell", prefs?.channel_in_app ?? true],
                ["channel_sound", "Sound at POS", prefs?.channel_sound ?? true],
                ["channel_email", "Email", prefs?.channel_email ?? true],
                ["channel_sms", "SMS alerts", prefs?.channel_sms ?? false],
                ["channel_whatsapp", "WhatsApp", prefs?.channel_whatsapp ?? true],
              ] as const
            ).map(([key, label, on]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <Label className="text-sm">{label}</Label>
                <Switch checked={on} onCheckedChange={(v) => togglePref(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
