import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { firebaseConfigured, fcmVapidKey, getFirebaseApp } from "@/lib/firebase";
import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PushStatus = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

const SW_WAIT_MS = 20_000;

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
    "serviceWorker" in navigator
  );
}

function siteOriginHint(): string {
  if (typeof window === "undefined") return "inuabiz.co.ke";
  return window.location.host || "inuabiz.co.ke";
}

function pushErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/push service error|token-subscribe-failed|registration-failed/i.test(msg)) {
    return `Push registration failed on ${siteOriginHint()}. Reload, then toggle This device again. Notifications are per-site — allow them for the exact URL you use (www.inuabiz.co.ke).`;
  }
  if (/vapid/i.test(msg)) {
    return "Push is misconfigured on this build. Contact support if this continues.";
  }
  return msg || "Could not enable device notifications.";
}

async function waitForActivePwaWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser cannot use background notifications.");
  }
  if (import.meta.env.DEV) {
    throw new Error(
      "Device notifications only work on the live app or a production build. Test on www.inuabiz.co.ke or run npm run build && npm run preview.",
    );
  }

  const deadline = Date.now() + SW_WAIT_MS;
  while (Date.now() < deadline) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active) return registration;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("InuaBiz could not start background alerts on this device. Reload the page and try again.");
}

async function clearLocalPushSubscriptions(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      await sub?.unsubscribe().catch(() => undefined);
    }),
  );
}

async function hasStoredSubscription(profileId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { count } = await sb
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return (count ?? 0) > 0;
}

export async function fetchPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { permission: "unsupported", subscribed: false };
  }
  if (!pushSupported()) {
    return { permission: Notification.permission, subscribed: false };
  }

  const sb = getSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user && (await hasStoredSubscription(user.id))) {
      return { permission: Notification.permission, subscribed: true };
    }
  }

  const ready = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await ready?.pushManager.getSubscription();
  return { permission: Notification.permission, subscribed: Boolean(sub) };
}

async function resolveVapidPublicKey(): Promise<string> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.rpc("push_vapid_public");
    if (typeof data === "string" && data.length > 20) return data.replace(/^"|"$/g, "");
    const { data: row } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "push.vapid_public")
      .maybeSingle();
    const value = row?.value;
    if (typeof value === "string" && value.length > 20) return value.replace(/^"|"$/g, "");
  }
  const envKey = fcmVapidKey();
  if (envKey) return envKey;
  throw new Error("Push is not configured on this environment yet.");
}

async function registerWebPush(profileId: string): Promise<void> {
  if (!("PushManager" in window)) {
    throw new Error("This browser cannot show device notifications.");
  }

  const registration = await waitForActivePwaWorker();
  const key = await resolveVapidPublicKey();

  await clearLocalPushSubscriptions();

  let sub: PushSubscription;
  try {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  } catch (err) {
    throw new Error(pushErrorMessage(err));
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.["p256dh"];
  const auth = json.keys?.["auth"];
  if (!endpoint || !p256dh || !auth) throw new Error("Browser did not return a push subscription.");

  const sb = getSupabase();
  if (!sb) return;

  await sb.from("push_subscriptions").delete().eq("profile_id", profileId);

  const { error } = await sb.from("push_subscriptions").upsert(
    {
      profile_id: profileId,
      endpoint,
      p256dh,
      auth,
      fcm_token: null,
      user_agent: navigator.userAgent.slice(0, 240),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

async function registerFirebasePush(profileId: string): Promise<void> {
  if (!(await isSupported())) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  let registration = registrations.find((reg) => reg.active?.scriptURL.includes("firebase-messaging-sw.js"));
  if (!registration) {
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }
  if (!registration?.active) return;

  const messaging = getMessaging(getFirebaseApp());
  const vapidKey = await resolveVapidPublicKey();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return;

  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      profile_id: profileId,
      fcm_token: token,
      endpoint: null,
      p256dh: null,
      auth: null,
      user_agent: navigator.userAgent.slice(0, 240),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fcm_token" },
  );
  if (error) throw new Error(error.message);
}

export async function enableDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("This browser cannot show device notifications.");
  }
  if (Notification.permission === "denied") {
    throw new Error(
      `Notifications are blocked for ${siteOriginHint()}. Open browser site settings, allow notifications, then try again.`,
    );
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

  await registerWebPush(user.id);

  if (firebaseConfigured()) {
    try {
      await registerFirebasePush(user.id);
    } catch {
      /* Web Push subscription is enough for closed-app alerts */
    }
  }
}

export async function disableDevicePush(): Promise<void> {
  const sb = getSupabase();

  await clearLocalPushSubscriptions();

  if (firebaseConfigured() && (await isSupported().catch(() => false))) {
    try {
      const messaging = getMessaging(getFirebaseApp());
      await deleteToken(messaging);
    } catch {
      /* ignore */
    }
  }

  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  await sb.from("push_subscriptions").delete().eq("profile_id", user.id);
}

export async function testDevicePush(): Promise<void> {
  const { error } = await invokeFunction("dispatch-push", { test: true });
  if (error) throw new Error(error);
}

/** Foreground FCM handler when an FCM token is also registered. */
export function listenForForegroundPush(
  onAlert: (payload: { title: string; body: string; url: string }) => void,
): () => void {
  if (!firebaseConfigured() || typeof window === "undefined") return () => undefined;

  let cancelled = false;
  void (async () => {
    if (!(await isSupported().catch(() => false))) return;
    const messaging = getMessaging(getFirebaseApp());
    onMessage(messaging, (payload) => {
      if (cancelled) return;
      const data = payload.data ?? {};
      onAlert({
        title: payload.notification?.title ?? data["title"] ?? "InuaBiz",
        body: payload.notification?.body ?? data["body"] ?? "",
        url: data["url"] ?? "/app/notifications",
      });
    });
  })();

  return () => {
    cancelled = true;
  };
}
