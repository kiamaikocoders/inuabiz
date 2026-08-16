import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Bell,
  ChartLine,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { vendorNotifications } from "@/lib/mock-data";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/pos", label: "Point of sale", icon: Store },
  { to: "/app/sales", label: "Sales", icon: Receipt },
  { to: "/app/inventory", label: "Inventory", icon: Package },
  { to: "/app/credit", label: "Duka debt", icon: CreditCard },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/insights", label: "AI insights", icon: Sparkles },
  { to: "/app/invoices", label: "Invoices", icon: FileText },
  { to: "/app/billing", label: "Subscription", icon: ChartLine },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-sidebar-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar py-5">
      <div className="px-5 pb-5">
        <Logo tone="inverted" />
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto px-4 pt-6">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <p className="text-xs font-semibold text-sidebar-primary">Trial · 3 days left</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">
            Subscribe for KES 3,000/month to keep POS, AI insights and reconciliation.
          </p>
          <Button size="sm" className="mt-3 w-full" variant="secondary" asChild>
            <Link to="/app/billing" onClick={onNavigate}>
              Subscribe now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const unread = vendorNotifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border p-0">
                <SidebarInner />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
              {description && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/app/notifications" aria-label="Notifications">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <span className="bg-primary-soft text-primary grid size-9 place-items-center rounded-full text-xs font-bold">
                MN
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
