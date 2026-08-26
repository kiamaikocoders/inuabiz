import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundStatus, OfflineStatus, ServerErrorStatus } from "@/components/status/screens";
import { useNetworkOnline } from "@/lib/network";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { captureInstallPrompt } from "@/lib/pwa-install";

captureInstallPrompt();

function NotFoundComponent() {
  return <NotFoundStatus />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const retry = () => {
    void router.invalidate();
    reset();
  };

  return <ServerErrorStatus onRetry={retry} />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (import.meta.env["VITE_MAINTENANCE"] === "true" && location.pathname !== "/maintenance") {
      throw redirect({ to: "/maintenance" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InuaBiz — Micro-POS for Kenyan vendors" },
      {
        name: "description",
        content:
          "InuaBiz is a mobile-first POS, M-Pesa reconciliation, credit ledger and AI cash-flow engine for Kenyan MSMEs.",
      },
      { name: "author", content: "InuaBiz" },
      { property: "og:title", content: "InuaBiz — Micro-POS for Kenyan vendors" },
      {
        property: "og:description",
        content:
          "Sell, track credit and reconcile M-Pesa from your phone. From KES 3,000 per shop / month. Compliance and enterprise options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B6E4F" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "InuaBiz" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { online, markOnline, retry } = useNetworkOnline();

  useEffect(() => {
    captureInstallPrompt();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <InstallPrompt />
      <Toaster position="top-center" richColors />
      {!online && (
        <div className="fixed inset-0 z-[100]">
          <OfflineStatus
            onRetry={() => {
              void retry().then((ok) => {
                if (!ok) window.location.reload();
              });
            }}
            onHome={markOnline}
          />
        </div>
      )}
    </QueryClientProvider>
  );
}
