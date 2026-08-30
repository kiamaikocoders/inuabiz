import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canNativeInstall,
  isStandaloneApp,
  promptNativeInstall,
} from "@/lib/pwa-install";
import { trackInstall } from "@/lib/analytics";

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Compact header CTA — kept separate so marketing pages skip the install dialog chunk. */
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
