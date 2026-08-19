type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/** Optional hosted Android APK (set VITE_APK_URL in production when built). */
export function apkDownloadUrl(): string | null {
  const url = import.meta.env["VITE_APK_URL"];
  return typeof url === "string" && url.length > 0 ? url : null;
}

export function captureInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("inuabiz-pwa-installable"));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("inuabiz-pwa-installed"));
  });
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isDesktopDevice(): boolean {
  if (typeof window === "undefined") return false;
  return !isIosDevice() && !isAndroidDevice();
}

export function canNativeInstall(): boolean {
  return deferredPrompt != null;
}

export async function promptNativeInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") deferredPrompt = null;
  return outcome;
}

export function installDismissKey(): string {
  return "inuabiz.pwa.install.dismissed";
}

export function shouldOfferInstall(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneApp()) return false;
  if (sessionStorage.getItem(installDismissKey()) === "1") return false;
  return (
    canNativeInstall() ||
    isIosDevice() ||
    isAndroidDevice() ||
    (isDesktopDevice() && !isStandaloneApp())
  );
}
