import { Download, Monitor, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  apkDownloadUrl,
  canNativeInstall,
  installDismissKey,
  isAndroidDevice,
  isDesktopDevice,
  isIosDevice,
  isStandaloneApp,
  promptNativeInstall,
  shouldOfferInstall,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

/**
 * Bottom banner on first visit: install PWA on desktop, Add to Home Screen / APK on phones.
 */
export function InstallPrompt({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refresh = () => {
      setVisible(shouldOfferInstall());
    };

    refresh();
    // Desktop Chrome may fire beforeinstallprompt a beat after load.
    const t = window.setTimeout(refresh, 1200);
    window.addEventListener("inuabiz-pwa-installable", refresh);
    window.addEventListener("inuabiz-pwa-installed", refresh);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("inuabiz-pwa-installable", refresh);
      window.removeEventListener("inuabiz-pwa-installed", refresh);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(installDismissKey(), "1");
    setVisible(false);
  };

  const install = async () => {
    setBusy(true);
    try {
      const outcome = await promptNativeInstall();
      if (outcome === "accepted") setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();
  const desktop = isDesktopDevice();
  const native = canNativeInstall();
  const apkUrl = apkDownloadUrl();

  return (
    <div
      className={cn(
        "border-border bg-card/95 fixed inset-x-3 bottom-3 z-[90] rounded-2xl border p-4 shadow-lift backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md",
        className,
      )}
      role="region"
      aria-label="Install InuaBiz app"
    >
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          {desktop ? <Monitor className="size-5" /> : <Smartphone className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {desktop ? "Install InuaBiz on desktop" : "Get InuaBiz on your phone"}
          </p>
          {ios ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Tap <Share className="mb-0.5 inline size-3.5" /> Share, then{" "}
              <strong>Add to Home Screen</strong> for a full-screen till app.
            </p>
          ) : android && !native && !apkUrl ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Open the browser menu and choose <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong> — installs like an APK without the Play Store.
            </p>
          ) : desktop ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Pin InuaBiz to your taskbar for faster checkout, offline shell loading and one-click
              till access.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Install once — sell, take M-Pesa STK and print receipts from your home screen.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {native && (
              <Button size="sm" onClick={() => void install()} disabled={busy}>
                <Download className="mr-1.5 size-3.5" />
                {busy
                  ? "Installing…"
                  : desktop
                    ? "Install on desktop"
                    : android
                      ? "Install on phone"
                      : "Install app"}
              </Button>
            )}
            {android && apkUrl && (
              <Button size="sm" variant={native ? "outline" : "default"} asChild>
                <a href={apkUrl} download>
                  <Download className="mr-1.5 size-3.5" />
                  Download APK
                </a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Compact install control for marketing headers. */
export function InstallAppButton({ className }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setShow(canNativeInstall() && !isStandaloneApp());
    refresh();
    window.addEventListener("inuabiz-pwa-installable", refresh);
    window.addEventListener("inuabiz-pwa-installed", refresh);
    return () => {
      window.removeEventListener("inuabiz-pwa-installable", refresh);
      window.removeEventListener("inuabiz-pwa-installed", refresh);
    };
  }, []);

  if (!show) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      onClick={() => void promptNativeInstall()}
    >
      <Download className="mr-1.5 size-3.5" /> Install
    </Button>
  );
}
