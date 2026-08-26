import {
  ClipboardCopy,
  Download,
  Monitor,
  RefreshCw,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  apkDownloadUrl,
  canNativeInstall,
  diagnoseInstallFailure,
  installDismissKey,
  isAndroidDevice,
  isIosDevice,
  isStandaloneApp,
  promptNativeInstall,
  shouldOfferInstall,
  waitForNativeInstall,
  type InstallDiagnosis,
} from "@/lib/pwa-install";
import { trackInstall } from "@/lib/analytics";
import { trackExposure } from "@/lib/experiments";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  return "desktop";
}

function browserName(): string {
  if (typeof navigator === "undefined") return "your browser";
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "your browser";
}

/** iOS Safari has no one-tap install — these steps are the only path. */
function IosInstallSteps() {
  const steps: { icon: ReactNode; text: ReactNode }[] = [
    { icon: <Share className="size-3.5" />, text: <>Tap the Share button in the Safari bar</> },
    {
      icon: <SquarePlus className="size-3.5" />,
      text: (
        <>
          Choose <strong>Add to Home Screen</strong>
        </>
      ),
    },
    {
      icon: <Smartphone className="size-3.5" />,
      text: (
        <>
          Tap <strong>Add</strong> — InuaBiz opens full screen like an app
        </>
      ),
    },
  ];
  return (
    <ol className="mt-2 space-y-2">
      {steps.map((s, i) => (
        <li
          key={i}
          className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
        >
          <span className="bg-muted text-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-md">
            {s.icon}
          </span>
          <span>
            <span className="text-foreground font-semibold">{i + 1}.</span> {s.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * First-visit install popup. Chrome/Edge/Android get a one-tap Install button
 * that opens the browser's native prompt. Manual steps stay behind a failure
 * fallback (and on iOS, where Safari has no native prompt).
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [diagnosis, setDiagnosis] = useState<InstallDiagnosis | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [variant, setVariant] = useState<"control" | "benefit_led">("control");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(detectPlatform());
    setVariant(trackExposure("install_prompt", "install_banner"));

    const show = () => {
      if (shouldOfferInstall()) setVisible(true);
    };
    const hideIfInstalled = () => {
      if (isStandaloneApp()) setVisible(false);
    };

    // iOS has no native prompt — show immediately. Chromium: wait briefly so
    // Install can call prompt() in the same click (user-gesture requirement).
    if (isIosDevice() || canNativeInstall()) {
      show();
    } else {
      const fallback = window.setTimeout(show, 1600);
      const onReady = () => {
        window.clearTimeout(fallback);
        show();
      };
      window.addEventListener("inuabiz-pwa-installable", onReady);
      window.addEventListener("inuabiz-pwa-installed", hideIfInstalled);
      return () => {
        window.clearTimeout(fallback);
        window.removeEventListener("inuabiz-pwa-installable", onReady);
        window.removeEventListener("inuabiz-pwa-installed", hideIfInstalled);
      };
    }

    window.addEventListener("inuabiz-pwa-installed", hideIfInstalled);
    return () => {
      window.removeEventListener("inuabiz-pwa-installed", hideIfInstalled);
    };
  }, []);

  useEffect(() => {
    if (visible) trackInstall("install_prompt_shown", { platform, native: canNativeInstall() });
  }, [visible, platform]);

  const dismiss = () => {
    sessionStorage.setItem(installDismissKey(), "1");
    trackInstall("install_prompt_dismissed", { platform, had_failure: diagnosis != null });
    setVisible(false);
  };

  const reportFailure = (outcome: "dismissed" | "unavailable" | "error") => {
    const found = diagnoseInstallFailure(outcome);
    setDiagnosis(found);
    trackInstall("install_troubleshoot_shown", {
      platform,
      outcome,
      reason: found.reason,
      browser: browserName(),
    });
  };

  const install = (retry = false) => {
    if (retry) trackInstall("install_retry_clicked", { platform, reason: diagnosis?.reason });

    // prompt() must run inside this click. Waiting for the event first drops
    // the user gesture and Chrome will refuse to open the install dialog.
    if (!canNativeInstall()) {
      setBusy(true);
      void waitForNativeInstall(4000).then((ready) => {
        setBusy(false);
        if (ready) {
          toast.success("Ready to install", { description: "Tap Install to add InuaBiz." });
          return;
        }
        trackInstall("install_failed", {
          platform,
          retry,
          reason: platform === "ios" ? "ios_manual_only" : "prompt_unavailable",
        });
        reportFailure("unavailable");
      });
      return;
    }

    setBusy(true);
    void promptNativeInstall()
      .then((outcome) => {
        if (outcome === "accepted") {
          trackInstall("install_accepted", { platform, retry });
          setDiagnosis(null);
          setVisible(false);
          return;
        }
        if (outcome === "dismissed") {
          trackInstall("install_declined", { platform, retry });
          reportFailure("dismissed");
        } else {
          trackInstall("install_failed", { platform, retry, reason: "prompt_unavailable" });
          reportFailure("unavailable");
        }
      })
      .catch(() => {
        trackInstall("install_failed", { platform, retry, reason: "prompt_error" });
        reportFailure("error");
      })
      .finally(() => setBusy(false));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("Link copied", { description: "Paste it into Chrome or Safari to install." });
      trackInstall("install_link_copied", { platform, reason: diagnosis?.reason });
    } catch {
      toast.error("Couldn't copy the link", { description: window.location.origin });
    }
  };

  const ios = platform === "ios";
  const android = platform === "android";
  const desktop = platform === "desktop";
  const apkUrl = apkDownloadUrl();
  const benefit = variant === "benefit_led";
  const failed = diagnosis != null;

  const headline = benefit
    ? desktop
      ? "Ring up sales without a browser tab"
      : "Sell and take M-Pesa from your home screen"
    : desktop
      ? `Install InuaBiz on ${browserName()}`
      : ios
        ? "Add InuaBiz to your Home Screen"
        : "Install InuaBiz on your phone";

  const blurb = benefit
    ? "Opens in one tap, remembers your till, and keeps the POS a thumb away."
    : desktop
      ? "Pin InuaBiz to your taskbar for faster checkout and one-click till access."
      : ios
        ? "Safari installs InuaBiz from the Share menu — full screen, no App Store."
        : "Install once — sell, take M-Pesa STK and print receipts from your home screen.";

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent
        className="max-w-[calc(100%-1.5rem)] gap-5 rounded-2xl p-6 sm:max-w-md"
        aria-describedby="install-prompt-desc"
        data-variant={variant}
      >
        <DialogHeader className="sm:text-center">
          <span className="bg-primary-soft text-primary mx-auto mb-1 grid size-12 place-items-center rounded-2xl">
            {desktop ? <Monitor className="size-6" /> : <Smartphone className="size-6" />}
          </span>
          <DialogTitle className="text-xl">
            {failed ? (diagnosis?.title ?? headline) : headline}
          </DialogTitle>
          <DialogDescription id="install-prompt-desc" className="text-sm leading-relaxed">
            {failed ? (diagnosis?.detail ?? blurb) : blurb}
          </DialogDescription>
        </DialogHeader>

        {ios && !failed && <IosInstallSteps />}

        {failed && (
          <ol className="border-border bg-muted/60 space-y-1.5 rounded-xl border p-3">
            {diagnosis?.actions.map((action, i) => (
              <li key={action} className="text-foreground text-xs leading-relaxed">
                <span className="font-semibold">{i + 1}.</span> {action}
              </li>
            ))}
          </ol>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {ios ? null : (
            <Button
              size="lg"
              className="w-full"
              onClick={() => void install(failed)}
              disabled={busy}
            >
              {failed ? (
                <RefreshCw className="size-4" />
              ) : (
                <Download className="size-4" />
              )}
              {busy ? "Installing…" : failed ? "Try again" : "Install"}
            </Button>
          )}
          {android && apkUrl && (
            <Button
              size="lg"
              variant={ios || failed ? "default" : "outline"}
              className="w-full"
              asChild
              onClick={() => trackInstall("apk_download_clicked", { platform })}
            >
              <a href={apkUrl} download>
                <Download className="size-4" />
                Download APK
              </a>
            </Button>
          )}
          {diagnosis?.offerCopyLink && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => void copyLink()}>
              <ClipboardCopy className="size-4" /> Copy link
            </Button>
          )}
          <Button size="sm" variant="ghost" className="w-full" onClick={dismiss}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      onClick={() => {
        trackInstall("install_prompt_shown", { platform: detectPlatform(), surface: "header" });
        void promptNativeInstall().then((outcome) => {
          trackInstall(
            outcome === "accepted"
              ? "install_accepted"
              : outcome === "dismissed"
                ? "install_declined"
                : "install_failed",
            { platform: detectPlatform(), surface: "header" },
          );
        });
      }}
    >
      <Download className="mr-1.5 size-3.5" /> Install
    </Button>
  );
}
