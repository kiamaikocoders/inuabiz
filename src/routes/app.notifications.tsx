import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, CreditCard, Package, Receipt, Settings2, Smartphone, Volume2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type NotificationItem } from "@/lib/mock-data";
import {
  fetchNotificationPrefs,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  playPosChime,
  saveNotificationPrefs,
} from "@/lib/ops";
import { disableDevicePush, enableDevicePush, fetchPushStatus, testDevicePush } from "@/lib/push";
import { unlockPosAudio } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
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
  const [pushBusy, setPushBusy] = useState(false);
  const [deviceOverride, setDeviceOverride] = useState<boolean | null>(null);
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
  const { data: push } = useQuery({
    queryKey: ["push-status"],
    queryFn: fetchPushStatus,
  });
  const items = live ?? [];
  const rows = items.filter((n) => (tab === "unread" ? !n.read : true));

  const togglePref = (
    key: "channel_in_app" | "channel_email" | "channel_sound" | "channel_push",
    value: boolean,
  ) => {
    void saveNotificationPrefs({ [key]: value })
      .then(() => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not save"));
  };

  const toggleDevice = async (on: boolean) => {
    setPushBusy(true);
    setDeviceOverride(on);
    unlockPosAudio();
    try {
      if (on) {
        await enableDevicePush();
        await saveNotificationPrefs({ channel_push: true });
        toast.success("Device notifications on", {
          description: "Sales and stock alerts will appear even when InuaBiz is in the background.",
        });
      } else {
        await disableDevicePush();
        await saveNotificationPrefs({ channel_push: false });
        toast.success("Device notifications off");
      }
      await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      await queryClient.invalidateQueries({ queryKey: ["push-status"] });
    } catch (err) {
      setDeviceOverride(null);
      toast.error(err instanceof Error ? err.message : "Could not update device notifications");
    } finally {
      setPushBusy(false);
      setDeviceOverride(null);
    }
  };

  const deviceBlocked = push?.permission === "denied";
  const deviceOn =
    deviceOverride ??
    Boolean(push?.subscribed && prefs?.channel_push !== false);

  return (
    <AppShell
      title="Notifications"
      description="Till bell, email, and this phone — no SMS yet"
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm">In-app bell</Label>
                <p className="text-muted-foreground text-xs">Toasts and the unread badge while you're in the till</p>
              </div>
              <Switch
                checked={prefs?.channel_in_app ?? true}
                onCheckedChange={(v) => togglePref("channel_in_app", v)}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm inline-flex items-center gap-1.5">
                  <Volume2 className="size-3.5" /> Sound at POS
                </Label>
                <p className="text-muted-foreground text-xs">Cash-register ding on sales and low stock</p>
              </div>
              <Switch
                checked={prefs?.channel_sound ?? true}
                onCheckedChange={(v) => {
                  togglePref("channel_sound", v);
                  if (v) playPosChime();
                }}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm">Email</Label>
                <p className="text-muted-foreground text-xs">Trial, stock, receipts and daily till summary</p>
              </div>
              <Switch
                checked={prefs?.channel_email ?? true}
                onCheckedChange={(v) => togglePref("channel_email", v)}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm inline-flex items-center gap-1.5">
                  <Smartphone className="size-3.5" /> This device
                </Label>
                <p className="text-muted-foreground text-xs">
                  {push?.permission === "unsupported"
                    ? "This browser cannot show lock-screen alerts"
                    : deviceBlocked
                      ? "Blocked in browser settings — allow notifications for inuabiz.co.ke"
                      : "Alerts when InuaBiz is in the background or closed"}
                </p>
              </div>
              <Switch
                checked={deviceOn}
                disabled={pushBusy || push?.permission === "unsupported" || deviceBlocked}
                onCheckedChange={(v) => void toggleDevice(v)}
              />
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              SMS and WhatsApp are not on this till yet. Share a receipt from the sale screen instead.
            </p>
            {deviceOn ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={pushBusy}
                onClick={() => {
                  void testDevicePush()
                    .then(() => toast.success("Test notification sent"))
                    .catch((err: unknown) =>
                      toast.error(err instanceof Error ? err.message : "Test failed"),
                    );
                }}
              >
                Send test notification
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
