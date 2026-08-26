type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let capturing = false;

/** Optional hosted Android APK (set VITE_APK_URL in production when built). */
export function apkDownloadUrl(): string | null {
  const url = import.meta.env["VITE_APK_URL"];
  return typeof url === "string" && url.length > 0 ? url : null;
}

export function captureInstallPrompt(): void {
  if (typeof window === "undefined" || capturing) return;
  capturing = true;
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

/** Chrome may fire `beforeinstallprompt` a beat after first paint. */
export function waitForNativeInstall(timeoutMs = 4000): Promise<boolean> {
  if (deferredPrompt) return Promise.resolve(true);
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener("inuabiz-pwa-installable", onReady);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const timer = window.setTimeout(() => finish(Boolean(deferredPrompt)), timeoutMs);
    window.addEventListener("inuabiz-pwa-installable", onReady);
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

/* ---------------- Install failure diagnostics ---------------- */

export type InstallFailureReason =
  | "already_installed"
  | "insecure_context"
  | "unsupported_ios_browser"
  | "ios_manual_only"
  | "unsupported_browser"
  | "prompt_dismissed"
  | "prompt_unavailable"
  | "prompt_error";

export type InstallDiagnosis = {
  reason: InstallFailureReason;
  title: string;
  detail: string;
  /** Concrete next actions, most useful first. */
  actions: string[];
  /** Offer "copy link and open elsewhere" as a recovery path. */
  offerCopyLink: boolean;
};

function isFirefox(): boolean {
  return typeof navigator !== "undefined" && /firefox|fxios/i.test(navigator.userAgent);
}

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /fban|fbav|instagram|line\/|micromessenger|twitter/i.test(navigator.userAgent);
}

function isIosSafari(): boolean {
  if (!isIosDevice() || typeof navigator === "undefined") return false;
  return !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
}

/** Maps an install attempt outcome to a specific, user-actionable diagnosis. */
export function diagnoseInstallFailure(
  outcome: "dismissed" | "unavailable" | "error",
): InstallDiagnosis {
  if (isStandaloneApp()) {
    return {
      reason: "already_installed",
      title: "InuaBiz is already installed",
      detail: "You're running the installed app right now.",
      actions: ["Open InuaBiz from your home screen or taskbar instead of the browser."],
      offerCopyLink: false,
    };
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      reason: "insecure_context",
      title: "This page isn't on a secure connection",
      detail: "Browsers only install apps served over HTTPS.",
      actions: [
        "Open the same address with https:// at the front.",
        "If you're on a shared Wi-Fi portal, reconnect and reload the page.",
      ],
      offerCopyLink: true,
    };
  }

  if (outcome === "dismissed") {
    return {
      reason: "prompt_dismissed",
      title: "Install was cancelled",
      detail: "The browser prompt was closed before the install finished.",
      actions: [
        "Tap Try again and choose Install in the browser dialog.",
        isDesktopDevice()
          ? "Or click the install icon on the right of the address bar."
          : "Or use the browser menu (⋮) and pick Install app.",
      ],
      offerCopyLink: false,
    };
  }

  if (isInAppBrowser()) {
    return {
      reason: "unsupported_browser",
      title: "In-app browsers can't install apps",
      detail: "You opened InuaBiz inside another app's built-in browser.",
      actions: [
        "Tap the ⋮ menu and choose Open in browser (Chrome or Safari).",
        "Then run the install again from there.",
      ],
      offerCopyLink: true,
    };
  }

  if (isIosDevice() && !isIosSafari()) {
    return {
      reason: "unsupported_ios_browser",
      title: "Use Safari to install on iPhone",
      detail: "Only Safari can add InuaBiz to your iPhone Home Screen.",
      actions: [
        "Copy the link below and paste it into Safari.",
        "In Safari, tap Share, then Add to Home Screen.",
      ],
      offerCopyLink: true,
    };
  }

  if (isIosDevice()) {
    return {
      reason: "ios_manual_only",
      title: "iPhone installs are manual",
      detail: "Safari has no one-tap install button — it uses the Share menu.",
      actions: [
        "Tap the Share button in the Safari toolbar.",
        "Scroll and choose Add to Home Screen, then tap Add.",
      ],
      offerCopyLink: false,
    };
  }

  if (isFirefox()) {
    return {
      reason: "unsupported_browser",
      title: "Firefox doesn't support one-click install",
      detail: isAndroidDevice()
        ? "Firefox on Android can still add a shortcut."
        : "Desktop Firefox cannot install web apps.",
      actions: isAndroidDevice()
        ? ["Open the ⋮ menu and tap Add to Home screen."]
        : ["Open InuaBiz in Chrome or Edge and install from the address bar."],
      offerCopyLink: true,
    };
  }

  if (outcome === "error") {
    return {
      reason: "prompt_error",
      title: "The browser stopped the install",
      detail: "Something interrupted the install dialog.",
      actions: [
        "Reload the page and tap Install again.",
        "If it keeps failing, clear the site data for InuaBiz and retry.",
      ],
      offerCopyLink: true,
    };
  }

  return {
    reason: "prompt_unavailable",
    title: "No install prompt available yet",
    detail: "This browser hasn't offered the install option for this site.",
    actions: [
      "Browse the app for a few seconds, then try again — Chrome unlocks install after some use.",
      isDesktopDevice()
        ? "Or use the browser menu → Install InuaBiz."
        : "Or use the browser menu (⋮) → Install app / Add to Home screen.",
    ],
    offerCopyLink: true,
  };
}
