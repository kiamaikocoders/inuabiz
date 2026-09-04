import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Menu, Package, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home", to: "/app", label: "Home", icon: LayoutDashboard, exact: true },
  { id: "sell", to: "/app/pos", label: "Sell", icon: Store, exact: false },
  { id: "stock", to: "/app/inventory", label: "Stock", icon: Package, exact: false },
  { id: "more", to: null, label: "More", icon: Menu, exact: false },
] as const;

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="mx-auto grid h-14 max-w-lg grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.id === "home"
              ? pathname === "/app" || pathname === "/app/"
              : tab.id === "sell"
                ? pathname.startsWith("/app/pos")
                : tab.id === "stock"
                  ? pathname.startsWith("/app/inventory")
                  : false;
          const className = cn(
            "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
            active ? "text-primary" : "text-muted-foreground",
          );

          if (tab.to == null) {
            return (
              <button
                key={tab.id}
                type="button"
                className={className}
                onClick={onMore}
                aria-label="More menu"
              >
                <Icon className={cn("size-5", active && "text-primary")} strokeWidth={2.25} />
                {tab.label}
              </button>
            );
          }

          return (
            <Link key={tab.id} to={tab.to as never} className={className} aria-current={active ? "page" : undefined}>
              <Icon className={cn("size-5", active && "text-primary")} strokeWidth={2.25} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
