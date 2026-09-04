import { useEffect, useState } from "react";
import { Bell, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SoftPermissionPrompt } from "@/components/app/SoftPermissionPrompt";
import { useGhost } from "@/lib/ghost";
import { reverseGeocode } from "@/lib/geo";
import {
  geolocationPermissionState,
  isSoftPromptSnoozed,
  markSoftPromptDone,
  notificationPermissionState,
  requestCurrentPosition,
  snoozeSoftPrompt,
  type SoftPermissionKind,
} from "@/lib/permission-prompts";
import { track } from "@/lib/analytics";
import { enableDevicePush, pushSupported } from "@/lib/push";
import { fetchTenantHeader, saveNotificationPrefs, saveTenantHeader } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { installDismissKey, shouldOfferInstall } from "@/lib/pwa-install";

type ActivePrompt = SoftPermissionKind | null;

/**
 * Soft prompts for browser notifications + location inside the vendor app.
 * Shows one at a time (notifications first), after the install dialog is out of the way.
 */
export function AppPermissionPrompts() {
  const ghost = useGhost();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActivePrompt>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ghost || typeof window === "undefined") return;

    let cancelled = false;
    let attempts = 0;
    let retryTimer = 0;

    const tryShow = async () => {
      if (cancelled) return;

      // Don't stack on top of the PWA install dialog — retry a few times.
      if (shouldOfferInstall() && sessionStorage.getItem(installDismissKey()) !== "1") {
        if (attempts < 10) {
          attempts += 1;
          retryTimer = window.setTimeout(() => void tryShow(), 2500);
        }
        return;
      }

      const notif = notificationPermissionState();
      if (pushSupported() && notif === "default" && !isSoftPromptSnoozed("notifications")) {
        if (!cancelled) {
          setActive("notifications");
          track("soft_prompt_shown", { kind: "notifications" });
        }
        return;
      }

      const geo = await geolocationPermissionState();
      if (geo === "prompt" && !isSoftPromptSnoozed("location")) {
        if (!cancelled) {
          setActive("location");
          track("soft_prompt_shown", { kind: "location" });
        }
      }
    };

    const timer = window.setTimeout(() => void tryShow(), 2200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [ghost]);

  const dismiss = (kind: SoftPermissionKind, outcome: "later" | "done") => {
    if (outcome === "later") snoozeSoftPrompt(kind);
    else markSoftPromptDone(kind);
    track("soft_prompt_dismissed", { kind, outcome });
    setActive(null);

    // After notifications, maybe show location next.
    if (kind === "notifications" && outcome === "later") {
      void geolocationPermissionState().then((geo) => {
        if (geo === "prompt" && !isSoftPromptSnoozed("location")) {
          window.setTimeout(() => {
            setActive("location");
            track("soft_prompt_shown", { kind: "location" });
          }, 600);
        }
      });
    }
  };

  const allowNotifications = async () => {
    setBusy(true);
    try {
      await enableDevicePush();
      if (isSupabaseConfigured()) {
        await saveNotificationPrefs({ channel_push: true });
        await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
        await queryClient.invalidateQueries({ queryKey: ["push-status"] });
      }
      markSoftPromptDone("notifications");
      track("soft_prompt_allowed", { kind: "notifications" });
      toast.success("Notifications on", {
        description: "You'll get payment and stock alerts on this device.",
      });
      setActive(null);

      const geo = await geolocationPermissionState();
      if (geo === "prompt" && !isSoftPromptSnoozed("location")) {
        window.setTimeout(() => {
          setActive("location");
          track("soft_prompt_shown", { kind: "location" });
        }, 600);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable notifications");
      if (notificationPermissionState() === "denied") {
        markSoftPromptDone("notifications");
        setActive(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const allowLocation = async () => {
    setBusy(true);
    try {
      const pos = await requestCurrentPosition();
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      markSoftPromptDone("location");
      track("soft_prompt_allowed", { kind: "location" });

      if (isSupabaseConfigured()) {
        const header = await fetchTenantHeader();
        if (header?.location_lat == null || header?.location_lng == null) {
          const address = await reverseGeocode(coords);
          await saveTenantHeader({
            location_lat: coords.lat,
            location_lng: coords.lng,
            address_text: address,
          });
          await queryClient.invalidateQueries({ queryKey: ["tenant-header"] });
          await queryClient.invalidateQueries({ queryKey: ["shops"] });
        }
      }

      toast.success("Location enabled", {
        description: "Used for your shop pin and regional insights — never shown publicly.",
      });
      setActive(null);
    } catch (err) {
      const denied =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 1;
      toast.error(
        denied
          ? "Location blocked in browser settings. Allow it from the address bar to pin your shop."
          : err instanceof Error
            ? err.message
            : "Could not read location",
      );
      if (denied) {
        markSoftPromptDone("location");
        setActive(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SoftPermissionPrompt
        open={active === "notifications"}
        onOpenChange={(open) => {
          if (!open) dismiss("notifications", "later");
        }}
        icon={Bell}
        title="Enable Notifications"
        description="Get instant updates on your payments, service alerts, and critical account activity. Only important stuff, we promise!"
        allowLabel="Allow Notifications"
        busy={busy}
        onAllow={() => void allowNotifications()}
        onLater={() => dismiss("notifications", "later")}
      />
      <SoftPermissionPrompt
        open={active === "location"}
        onOpenChange={(open) => {
          if (!open) dismiss("location", "later");
        }}
        icon={MapPin}
        title="Enable Location"
        description="Pin your shop for the store map and regional insights. We only use it for your business — nothing is shown publicly."
        allowLabel="Allow Location"
        busy={busy}
        onAllow={() => void allowLocation()}
        onLater={() => dismiss("location", "later")}
      />
    </>
  );
}
