/** Register the production PWA service worker as early as possible (FCM + offline shell). */
export function initPwaServiceWorker(): void {
  if (import.meta.env.SSR || import.meta.env.DEV || !("serviceWorker" in navigator)) return;

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch((err: unknown) => {
      console.warn("PWA service worker registration failed", err);
    });
}
