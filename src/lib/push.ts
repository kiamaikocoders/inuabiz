import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { firebaseConfigured, fcmVapidKey, getFirebaseApp } from "@/lib/firebase";
import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PushStatus = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

const SW_WAIT_MS = 20_000;
const FCM_SW_URL = "/firebase-messaging-sw.js";

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

function pushErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/push service error|token-subscribe-failed|registration-failed/i.test(msg)) {
    return "Push registration failed. Reload the page, then try again. If it still fails, allow notifications for inuabiz.co.ke in browser settings.";
  }
  if (/vapid/i.test(msg)) {
    return "Push is misconfigured on this build. Contact support if this continues.";
  }
  return msg || "Could not enable device notifications.";
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;

  const worker = registration.installing ?? registration.waiting;
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Service worker install timed out.")), SW_WAIT_MS);
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          clearTimeout(timer);
          resolve();
        }
        if (worker.state === "redundant") {
          clearTimeout(timer);
          reject(new Error("Service worker failed to activate."));
        }
      });
    });
    return registration;
  }

  const deadline = Date.now() + SW_WAIT_MS;
  while (Date.now() < deadline) {
    if (registration.active) return registration;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("InuaBiz could not start background alerts on this device. Reload and try again.");
}

async function getFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser cannot use background notifications.");
  }
  if (import.meta.env.DEV) {
    throw new Error(
      "Device notifications only work on the live app or a production build. Test on inuabiz.co.ke or run npm run build && npm run preview.",
    );
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  let registration = registrations.find((reg) => reg.active?.scriptURL.includes("firebase-messaging-sw.js"));
  if (!registration) {
    registration = await navigator.serviceWorker.register(FCM_SW_URL);
  }
  return waitForActiveWorker(registration);
}

async function getPwaServiceWorker(): Promise<ServiceWorkerRegistration> {
  const deadline = Date.now() + SW_WAIT_MS;
  while (Date.now() < deadline) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active) return registration;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("InuaBiz could not start background alerts on this device. Reload the page and try again.");
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
      const reg = (await navigator.serviceWorker.getRegistrations()).find((r) =>
        r.active?.scriptURL.includes("firebase-messaging-sw.js"),
      );
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

  const registration = await getFcmServiceWorker();
  const messaging = getMessaging(getFirebaseApp());
  const vapidKey = fcmVapidKey();
  if (!vapidKey) throw new Error("Firebase VAPID key is missing on this build.");

  let token: string | undefined;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    throw new Error(pushErrorMessage(err));
  }
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

  const ready = await getPwaServiceWorker();

  const key = await legacyVapidPublicKey();
  if (!key) throw new Error("Push is not configured on this environment yet.");

  let sub: PushSubscription;
  try {
    sub = await ready.pushManager.subscribe({
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
    try {
      await registerFirebasePush(user.id);
      return;
    } catch (err) {
      const message = pushErrorMessage(err);
      try {
        await registerLegacyWebPush(user.id);
        return;
      } catch {
        throw new Error(message);
      }
    }
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
    const fcmReg = (await navigator.serviceWorker.getRegistrations()).find((r) =>
      r.active?.scriptURL.includes("firebase-messaging-sw.js"),
    );
    await fcmReg?.unregister().catch(() => undefined);
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

/** Foreground FCM handler — shows alerts when the app is open but realtime missed. */
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
