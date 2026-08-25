import {
  Chrome,
  ClipboardCopy,
  Download,
  Monitor,
  MoreVertical,
  RefreshCw,
  Share,
  Smartphone,
  SquarePlus,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  apkDownloadUrl,
  canNativeInstall,
  diagnoseInstallFailure,
  installDismissKey,
  isAndroidDevice,
  isDesktopDevice,
  isIosDevice,
  isStandaloneApp,
  promptNativeInstall,
  shouldOfferInstall,
  type InstallDiagnosis,
} from "@/lib/pwa-install";
import { trackInstall } from "@/lib/analytics";
import { trackExposure } from "@/lib/experiments";
import { cn } from "@/lib/utils";

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

/** Per-device, step-by-step manual install instructions. */
function manualSteps(platform: Platform): { icon: ReactNode; text: ReactNode }[] {
  if (platform === "ios") {
    return [
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
  }
  if (platform === "android") {
    return [
      {
        icon: <MoreVertical className="size-3.5" />,
        text: <>Open the {browserName()} menu (⋮, top right)</>,
      },
      {
        icon: <Download className="size-3.5" />,
        text: (
          <>
            Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
          </>
        ),
      },
      {
        icon: <Smartphone className="size-3.5" />,
        text: <>Confirm — it installs like an APK, no Play Store needed</>,
      },
    ];
  }
  return [
    {
      icon: <Chrome className="size-3.5" />,
      text: <>Click the install icon in the {browserName()} address bar</>,
    },
    {
      icon: <MoreVertical className="size-3.5" />,
      text: (
        <>
          Or open the menu → <strong>Install InuaBiz</strong> / <strong>Apps → Install</strong>
        </>
      ),
    },
    {
      icon: <Monitor className="size-3.5" />,
      text: <>InuaBiz gets its own window and taskbar icon</>,
    },
  ];
}

function ManualInstructions({ platform }: { platform: Platform }) {
  return (
    <ol className="mt-3 space-y-2">
      {manualSteps(platform).map((s, i) => (
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
 * Bottom banner on first visit: install PWA on desktop, Add to Home Screen / APK on phones.
 */
export function InstallPrompt({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [diagnosis, setDiagnosis] = useState<InstallDiagnosis | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [variant, setVariant] = useState<"control" | "benefit_led">("control");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(detectPlatform());
    setVariant(trackExposure("install_prompt", "install_banner"));

    const refresh = () => setVisible(shouldOfferInstall());

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

  useEffect(() => {
    if (visible) trackInstall("install_prompt_shown", { platform, native: canNativeInstall() });
  }, [visible, platform]);

  const dismiss = () => {
    sessionStorage.setItem(installDismissKey(), "1");
    trackInstall("install_prompt_dismissed", { platform, had_failure: diagnosis != null });
    setVisible(false);
  };

  const revealSteps = () => {
    setShowSteps(true);
    trackInstall("install_instructions_shown", { platform });
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
    revealSteps();
  };

  const install = async (retry = false) => {
    setBusy(true);
    if (retry) trackInstall("install_retry_clicked", { platform, reason: diagnosis?.reason });
    try {
      const outcome = await promptNativeInstall();
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
    } catch {
      trackInstall("install_failed", { platform, retry, reason: "prompt_error" });
      reportFailure("error");
    } finally {
      setBusy(false);
    }
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

  if (!visible) return null;

  const ios = platform === "ios";
  const android = platform === "android";
  const desktop = platform === "desktop";
  const native = canNativeInstall();
  const apkUrl = apkDownloadUrl();
  const benefit = variant === "benefit_led";
  // iOS never exposes a native prompt, so instructions are the primary path there.
  const instructionsOpen = showSteps || ios || (!native && !apkUrl);

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
    <div
      className={cn(
        "border-border bg-card/95 fixed inset-x-3 bottom-3 z-[90] rounded-2xl border p-4 shadow-lift backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md",
        className,
      )}
      role="region"
      aria-label="Install InuaBiz app"
      data-variant={variant}
    >
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          {desktop ? <Monitor className="size-5" /> : <Smartphone className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{diagnosis ? diagnosis.title : headline}</p>

          <p className="text-muted-foreground mt-1 text-xs leading-relaxed" role={diagnosis ? "status" : undefined}>
            {diagnosis ? diagnosis.detail : blurb}
          </p>

          {diagnosis && (
            <ol className="border-border bg-muted/60 mt-3 space-y-1.5 rounded-xl border p-3">
              {diagnosis.actions.map((action, i) => (
                <li key={action} className="text-foreground text-xs leading-relaxed">
                  <span className="font-semibold">{i + 1}.</span> {action}
                </li>
              ))}
            </ol>
          )}

          {instructionsOpen && <ManualInstructions platform={platform} />}

          <div className="mt-3 flex flex-wrap gap-2">
            {native && (
              <Button size="sm" onClick={() => void install(diagnosis != null)} disabled={busy}>
                {diagnosis ? (
                  <RefreshCw className="mr-1.5 size-3.5" />
                ) : (
                  <Download className="mr-1.5 size-3.5" />
                )}
                {busy
                  ? "Installing…"
                  : diagnosis
                    ? "Try again"
                    : desktop
                      ? "Install on desktop"
                      : android
                        ? "Install on phone"
                        : "Install app"}
              </Button>
            )}
            {android && apkUrl && (
              <Button
                size="sm"
                variant={native ? "outline" : "default"}
                asChild
                onClick={() => trackInstall("apk_download_clicked", { platform })}
              >
                <a href={apkUrl} download>
                  <Download className="mr-1.5 size-3.5" />
                  Download APK
                </a>
              </Button>
            )}
            {diagnosis?.offerCopyLink && (
              <Button size="sm" variant="outline" onClick={() => void copyLink()}>
                <ClipboardCopy className="mr-1.5 size-3.5" /> Copy link
              </Button>
            )}
            {!instructionsOpen && (
              <Button size="sm" variant="outline" onClick={revealSteps}>
                How to install
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
