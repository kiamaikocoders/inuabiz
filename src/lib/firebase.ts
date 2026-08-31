import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";

/** Public Firebase web config (safe in client bundles). */
export function readFirebaseConfig(): FirebaseOptions | null {
  const apiKey = import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined;
  const projectId = import.meta.env["VITE_FIREBASE_PROJECT_ID"] as string | undefined;
  const appId = import.meta.env["VITE_FIREBASE_APP_ID"] as string | undefined;
  const messagingSenderId = import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] as string | undefined;
  if (!apiKey || !projectId || !appId || !messagingSenderId) return null;

  const config: FirebaseOptions = { apiKey, projectId, messagingSenderId, appId };
  const authDomain = import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] as string | undefined;
  const storageBucket = import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] as string | undefined;
  const measurementId = import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"] as string | undefined;
  if (authDomain) config.authDomain = authDomain;
  if (storageBucket) config.storageBucket = storageBucket;
  if (measurementId) config.measurementId = measurementId;
  return config;
}

export function fcmVapidKey(): string | null {
  const key = import.meta.env["VITE_FIREBASE_VAPID_KEY"] as string | undefined;
  return key && key.length > 20 ? key : null;
}

export function firebaseConfigured(): boolean {
  return readFirebaseConfig() != null && fcmVapidKey() != null;
}

export function getFirebaseApp() {
  const config = readFirebaseConfig();
  if (!config) throw new Error("Firebase is not configured on this build.");
  return getApps().length ? getApp() : initializeApp(config);
}
