import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PushStatus = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function fetchPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { permission: "unsupported", subscribed: false };
  }
  if (!pushSupported()) {
    return { permission: Notification.permission, subscribed: false };
  }
  const ready = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await ready?.pushManager.getSubscription();
  return { permission: Notification.permission, subscribed: Boolean(sub) };
}

async function vapidPublicKey(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc("push_vapid_public");
  if (typeof data === "string" && data.length > 20) return data.replace(/^"|"$/g, "");
  const { data: row } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", "push.vapid_public")
    .maybeSingle();
  const value = row?.value;
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  return null;
}

export async function enableDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("This browser cannot show device notifications.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications in the browser to get alerts when InuaBiz is closed.");
  }

  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in to enable device notifications.");

  if (!pushSupported()) return;

  const ready = await navigator.serviceWorker.ready.catch(() => null);
  if (!ready) return;

  const key = await vapidPublicKey();
  if (!key) throw new Error("Push is not configured on this environment yet.");

  const sub = await ready.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  });
  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.["p256dh"];
  const auth = json.keys?.["auth"];
  if (!endpoint || !p256dh || !auth) throw new Error("Browser did not return a push subscription.");

  const { error } = await sb.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 240),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function disableDevicePush(): Promise<void> {
  const sb = getSupabase();
  const ready = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await ready?.pushManager.getSubscription();
  const endpoint = sub?.endpoint;
  await sub?.unsubscribe().catch(() => undefined);
  if (!sb || !endpoint) return;
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function testDevicePush(): Promise<void> {
  const { error } = await invokeFunction("dispatch-push", { test: true });
  if (error) throw new Error(error);
}
