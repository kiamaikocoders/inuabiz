import { AlertTriangle, CloudOff, Lock, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { StatusPage } from "@/components/status/StatusPage";

/**
 * 404 — unknown route.
 */
export function NotFoundStatus() {
  return (
    <StatusPage
      icon={Search}
      code="404"
      title="Oops! We couldn't find that page"
      description="That link may have moved, or the duka page no longer exists. Head home or browse how InuaBiz helps Kenyan shops."
      primary={{ label: "Back to Home", to: "/" }}
      secondary={{ label: "For dukas", to: "/for-dukas" }}
      meta="Error code · 404"
      documentTitle="Page not found — InuaBiz"
    />
  );
}

/**
 * 500 — uncaught route error.
 */
export function ServerErrorStatus({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusPage
      icon={AlertTriangle}
      code="500"
      title="Something went wrong on our end"
      description="We hit an unexpected error. Your sales and stock are safe — please try again in a moment."
      primary={{ label: "Try again", onClick: onRetry }}
      secondary={{ label: "Back to Home", to: "/" }}
      meta="Error code · 500"
      documentTitle="Something went wrong — InuaBiz"
    />
  );
}

/**
 * Offline — no network. Home always does a full navigation so a stuck overlay cannot trap the user.
 */
export function OfflineStatus({
  onRetry,
  onHome,
}: {
  onRetry?: () => void;
  onHome?: () => void;
}) {
  return (
    <StatusPage
      icon={CloudOff}
      title="You're offline"
      description="Check your connection. Sales, stock and duka debt will sync when you're back online."
      primary={{
        label: "Retry",
        onClick: onRetry ?? (() => window.location.reload()),
      }}
      secondary={{
        label: "Back to Home",
        onClick: () => {
          onHome?.();
          window.location.assign("/");
        },
      }}
      meta="No network connection"
      documentTitle="You're offline — InuaBiz"
    />
  );
}

/**
 * Planned maintenance window.
 */
export function MaintenanceStatus() {
  return (
    <StatusPage
      icon={Settings}
      title="We'll be right back"
      description="InuaBiz is taking a short maintenance window. Your duka data is safe — thanks for your patience."
      primary={{
        label: "Notify me",
        onClick: () =>
          toast.success("We'll ping you", {
            description: "You'll get an SMS when the duka is back online.",
          }),
      }}
      secondary={{ label: "Back to Home", to: "/" }}
      meta="Estimated downtime · ~15 min"
      documentTitle="We'll be right back — InuaBiz"
    />
  );
}

/**
 * 403 — signed-out or unauthorised.
 */
export function ForbiddenStatus() {
  return (
    <StatusPage
      icon={Lock}
      code="403"
      title="You don't have access"
      description="This area is for signed-in vendors. Sign in with your phone, or head back to the public site."
      primary={{ label: "Log in", to: "/login" }}
      secondary={{ label: "Back to Home", to: "/" }}
      meta="Error code · 403"
      documentTitle="Access denied — InuaBiz"
    />
  );
}
