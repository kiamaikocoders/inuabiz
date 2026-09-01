import { deleteToken, getMessaging, isSupported, onMessage } from "firebase/messaging";
import { firebaseConfigured, fcmVapidKey, getFirebaseApp } from "@/lib/firebase";
import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PushStatus = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

const SW_WAIT_MS = 20_000;
const PWA_SW_PATH = "/sw.js";

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
  if (typeof window === "undefined") return "www.inuabiz.co.ke";
  return window.location.host || "www.inuabiz.co.ke";
}

function isPwaServiceWorker(scriptUrl: string | undefined): boolean {
  if (!scriptUrl) return false;
  try {
    const path = new URL(scriptUrl, window.location.origin).pathname;
    return path === PWA_SW_PATH || path.endsWith("/sw.js");
  } catch {
    return scriptUrl.includes("/sw.js");
  }
}

function isFirebaseMessagingWorker(scriptUrl: string | undefined): boolean {
  return Boolean(scriptUrl?.includes("firebase-messaging-sw.js"));
}

function isValidVapidPublicKey(key: string): boolean {
  if (!/^[A-Za-z0-9_-]{80,96}$/.test(key) || key.startsWith("eyJ")) return false;
  try {
    const bytes = urlBase64ToUint8Array(key);
    return bytes.length === 65 && bytes[0] === 4;
  } catch {
    return false;
  }
}

function pushErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/push service error|token-subscribe-failed|registration-failed/i.test(msg)) {
    return `Could not register this device for push on ${siteOriginHint()}. Hard-refresh the page (Ctrl+Shift+R), then toggle This device again. If you use both inuabiz.co.ke and www.inuabiz.co.ke, allow notifications on the exact URL you use.`;
  }
  if (/vapid|not configured/i.test(msg)) {
    return "Push is misconfigured on this build. Contact support if this continues.";
  }
  return msg || "Could not enable device notifications.";
}

async function unregisterFirebaseMessagingWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        [registration.active, registration.waiting, registration.installing].some((worker) =>
          isFirebaseMessagingWorker(worker?.scriptURL),
        ),
      )
      .map((registration) => registration.unregister().catch(() => undefined)),
  );
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

  await unregisterFirebaseMessagingWorkers();

  const deadline = Date.now() + SW_WAIT_MS;
  let registered = false;
  while (Date.now() < deadline) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const pwaRegistration = registrations.find((registration) =>
      [registration.active, registration.waiting, registration.installing].some((worker) =>
        isPwaServiceWorker(worker?.scriptURL),
      ),
    );

    if (pwaRegistration?.active && isPwaServiceWorker(pwaRegistration.active.scriptURL)) {
      return pwaRegistration;
    }

    if (!registered && !pwaRegistration) {
      registered = true;
      await navigator.serviceWorker.register(PWA_SW_PATH).catch(() => undefined);
    }

    if (pwaRegistration) {
      const worker = pwaRegistration.installing ?? pwaRegistration.waiting;
      if (worker) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, SW_WAIT_MS);
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated" || worker.state === "redundant") {
              window.clearTimeout(timer);
              resolve();
            }
          });
        });
        if (pwaRegistration.active && isPwaServiceWorker(pwaRegistration.active.scriptURL)) {
          return pwaRegistration;
        }
      }
    }

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

function normalizeVapidPublicKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().replace(/^"|"$/g, "");
  return isValidVapidPublicKey(key) ? key : null;
}

async function resolveVapidPublicKey(): Promise<string> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc("push_vapid_public");
    const rpcKey = normalizeVapidPublicKey(data);
    if (rpcKey) return rpcKey;
    if (error) console.warn("push_vapid_public failed", error.message);

    const { data: row, error: settingsError } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "push.vapid_public")
      .maybeSingle();
    const settingsKey = normalizeVapidPublicKey(row?.value);
    if (settingsKey) return settingsKey;
    if (settingsError) console.warn("push.vapid_public lookup failed", settingsError.message);
  }

  const envKey = normalizeVapidPublicKey(fcmVapidKey());
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
}

export async function disableDevicePush(): Promise<void> {
  const sb = getSupabase();

  await clearLocalPushSubscriptions();
  await unregisterFirebaseMessagingWorkers();

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
