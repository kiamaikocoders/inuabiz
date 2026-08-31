import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseConfigured, fcmVapidKey, getFirebaseApp } from "@/lib/firebase";
import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PushStatus = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

const SW_WAIT_MS = 15_000;

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

async function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser cannot use background notifications.");
  }
  if (import.meta.env.DEV) {
    throw new Error(
      "Device notifications only work on the live app or a production build. Test on inuabiz.co.ke or run npm run build && npm run preview.",
    );
  }

  const deadline = Date.now() + SW_WAIT_MS;
  while (Date.now() < deadline) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active) return registration;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    "InuaBiz could not start background alerts on this device. Reload the page and try again.",
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

  if (firebaseConfigured() && Notification.permission === "granted" && (await isSupported())) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (reg) {
        const messaging = getMessaging(getFirebaseApp());
        const token = await getToken(messaging, {
          vapidKey: fcmVapidKey()!,
          serviceWorkerRegistration: reg,
        });
        if (token) return { permission: Notification.permission, subscribed: true };
      }
    } catch {
      /* fall through */
    }
  }

  const ready = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await ready?.pushManager.getSubscription();
  return { permission: Notification.permission, subscribed: Boolean(sub) };
}

async function legacyVapidPublicKey(): Promise<string | null> {
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

async function registerFirebasePush(profileId: string): Promise<void> {
  if (!(await isSupported())) {
    throw new Error("This browser cannot use Firebase push notifications.");
  }

  const registration = await waitForServiceWorker();
  const messaging = getMessaging(getFirebaseApp());
  const vapidKey = fcmVapidKey();
  if (!vapidKey) throw new Error("Firebase VAPID key is missing on this build.");

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Could not register this device with Firebase.");

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

async function registerLegacyWebPush(profileId: string): Promise<void> {
  if (!("PushManager" in window)) {
    throw new Error("This browser cannot show device notifications.");
  }

  const ready = await waitForServiceWorker();

  const key = await legacyVapidPublicKey();
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

  const sb = getSupabase();
  if (!sb) return;

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

export async function enableDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("This browser cannot show device notifications.");
  }
  if (Notification.permission === "denied") {
    throw new Error(
      "Notifications are blocked for InuaBiz in this browser. Allow them in site settings, then try again.",
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

  if (firebaseConfigured()) {
    await registerFirebasePush(user.id);
    return;
  }

  await registerLegacyWebPush(user.id);
}

export async function disableDevicePush(): Promise<void> {
  const sb = getSupabase();

  if (firebaseConfigured() && (await isSupported().catch(() => false))) {
    try {
      const messaging = getMessaging(getFirebaseApp());
      await deleteToken(messaging);
    } catch {
      /* ignore */
    }
  }

  const ready = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await ready?.pushManager.getSubscription();
  const endpoint = sub?.endpoint;
  await sub?.unsubscribe().catch(() => undefined);

  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  await sb.from("push_subscriptions").delete().eq("profile_id", user.id);
  if (endpoint) await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function testDevicePush(): Promise<void> {
  const { error } = await invokeFunction("dispatch-push", { test: true });
  if (error) throw new Error(error);
}
