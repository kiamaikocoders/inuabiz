import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundStatus, ServerErrorStatus } from "@/components/status/screens";
import { captureInstallPrompt } from "@/lib/pwa-install";
import { initPwaServiceWorker } from "@/lib/pwa-register";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import { trackPageView } from "@/lib/analytics";
import { initClarity } from "@/lib/monitoring";
import * as Sentry from "@sentry/tanstackstart-react";

const InstallPrompt = lazy(() =>
  import("@/components/app/InstallPrompt").then((m) => ({ default: m.InstallPrompt })),
);

captureInstallPrompt();

function NotFoundComponent() {
  return <NotFoundStatus />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    Sentry.captureException(error);
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
          "InuaBiz (Inua Biz) is Kenya's micro-POS for dukas: M-Pesa till, credit ledger, stock alerts and AI restock advice. Start free on your phone.",
      },
      { name: "author", content: SITE_NAME },
      { name: "application-name", content: SITE_NAME },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_KE" },
      { property: "og:title", content: "InuaBiz — Micro-POS for Kenyan vendors" },
      {
        property: "og:description",
        content:
          "Sell, track credit and reconcile M-Pesa from your phone. One price per shop / month. Compliance and enterprise options.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      { name: "theme-color", content: "#0B6E4F" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preload", href: appCss, as: "style" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa/apple-touch-icon.png" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    captureInstallPrompt();
    initPwaServiceWorker();
    initClarity();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/app")) return;
    let stop = () => undefined;
    let cancelled = false;
    void import("@/lib/offline/sync").then((m) => {
      if (cancelled) return;
      stop = m.startOfflineSyncWatcher();
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Suspense fallback={null}>
        <InstallPrompt />
      </Suspense>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
