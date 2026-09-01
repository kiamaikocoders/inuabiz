import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGhost } from "@/lib/ghost";
import { fetchNotificationPrefs, playPosChime, unlockPosAudio, type Prefs } from "@/lib/ops";
import { listenForForegroundPush } from "@/lib/push";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const CHIME_TYPES = new Set(["SALE", "STOCK_LOW", "CREDIT", "PAYMENT"]);

function maybePageNotification(title: string, body: string, url: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/pwa/icon-192.png",
      tag: "inuabiz-live",
    });
    n.onclick = () => {
      window.focus();
      if (url) window.location.assign(url);
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/**
 * Live in-app toasts, till chime, and background-tab notifications.
 * Closed-app delivery is web push via the service worker.
 */
export function NotificationLive({ kind }: { kind: "vendor" | "admin" }) {
  const queryClient = useQueryClient();
  const ghost = useGhost();
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: fetchNotificationPrefs,
    enabled: isSupabaseConfigured(),
  });
  const prefsRef = useRef<Prefs | null>(null);
  prefsRef.current = prefs ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const stopForeground = listenForForegroundPush(({ title, body, url }) => {
      const livePrefs = prefsRef.current;
      if (livePrefs?.channel_in_app !== false) {
        toast(title, { description: body });
      }
      if (livePrefs?.channel_sound !== false) {
        playPosChime();
      }
      if (livePrefs?.channel_push !== false) {
        maybePageNotification(title, body, url);
      }
    });
    return stopForeground;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    const bind = async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (cancelled || !user) return;

      const filter = ghost?.tenantId
        ? `tenant_id=eq.${ghost.tenantId}`
        : `recipient_id=eq.${user.id}`;

      channel = sb
        .channel(`notifications-live-${kind}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          (payload) => {
            const row = payload.new as {
              title?: string;
              message?: string;
              type?: string;
              recipient_id?: string;
              metadata?: { url?: string } | null;
            };
            if (!ghost && row.recipient_id && row.recipient_id !== user.id) return;

            void queryClient.invalidateQueries({ queryKey: ["notifications"] });

            const livePrefs = prefsRef.current;
            const title = String(row.title ?? "InuaBiz");
            const message = String(row.message ?? "");
            const url =
              row.metadata?.url ||
              (kind === "admin" ? "/admin/notifications" : "/app/notifications");

            if (livePrefs?.channel_in_app !== false) {
              toast(title, { description: message });
            }
            if (livePrefs?.channel_sound !== false && CHIME_TYPES.has(String(row.type))) {
              playPosChime();
            }
            if (livePrefs?.channel_push !== false) {
              maybePageNotification(title, message, url);
            }
          },
        )
        .subscribe();
    };

    void bind();
    return () => {
      cancelled = true;
      if (channel) void sb.removeChannel(channel);
    };
  }, [kind, queryClient, ghost?.tenantId]);

  return null;
}
