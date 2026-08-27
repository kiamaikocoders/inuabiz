import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  ChartLine,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { vendorNotifications } from "@/lib/mock-data";
import { stopGhost, useGhost } from "@/lib/ghost";
import { useIdentity } from "@/lib/identity";
import { UserMenu } from "@/components/app/UserMenu";
import { useQuery } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchShops,
  fetchTenantAccess,
  setActiveShop,
} from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchProfile } from "@/lib/auth";
import { useShopCategory } from "@/hooks/use-shop-category";
import type { FeatureModule } from "@/lib/category";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/pos", label: "Point of sale", icon: Store },
  { to: "/app/sales", label: "Sales", icon: Receipt },
  { to: "/app/inventory", label: "Inventory", icon: Package },
  { to: "/app/credit", label: "Duka debt", icon: CreditCard },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/insights", label: "AI insights", icon: Sparkles },
  { to: "/app/invoices", label: "Invoices", icon: FileText },
  { to: "/app/shops", label: "Shops", icon: Store },
  { to: "/app/billing", label: "Subscription", icon: ChartLine },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/profile", label: "Profile", icon: UserRound },
];

const MODULE_ICON: Partial<Record<FeatureModule, LucideIcon>> = {
  table_management: LayoutGrid,
  order_queue: UtensilsCrossed,
  ticket_print: Ticket,
  expiry_alerts: CalendarClock,
};

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { def, category } = useShopCategory();
  const items: NavItem[] = [
    ...nav.slice(0, 2),
    ...def.nav.map((item) => ({
      to: item.to,
      label: item.label,
      icon: MODULE_ICON[item.module] ?? Store,
    })),
    ...nav.slice(2).map((item) =>
      item.to === "/app/credit"
        ? { ...item, label: category === "DUKA" ? "Duka debt" : "Credit book" }
        : item,
    ),
  ];

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as never}
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

function SidebarInner({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { data: access = true } = useQuery({
    queryKey: ["tenant-access"],
    queryFn: fetchTenantAccess,
    enabled: isSupabaseConfigured(),
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: isSupabaseConfigured(),
  });
  const { data: profile } = useQuery({
    queryKey: ["identity"],
    queryFn: fetchProfile,
  });

  return (
    <div className="flex h-full flex-col bg-sidebar py-5">
      <div className="px-5 pb-5">
        <Logo tone="inverted" />
      </div>
      {shops.length > 1 && (
        <div className="px-3 pb-3">
          <select
            className="bg-sidebar-accent text-sidebar-foreground w-full rounded-lg px-3 py-2 text-xs"
            value={profile?.active_shop_id ?? ""}
            onChange={(e) => {
              void setActiveShop(e.target.value).then(() => window.location.reload());
            }}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto px-4 pt-6">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <p className="text-xs font-semibold text-sidebar-primary">
            {access ? "Subscription" : "Access locked"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">
            {access
              ? "KES 3,000 per shop / month. Two shops are KES 6,000."
              : "Renew to keep POS, AI insights and reconciliation."}
          </p>
          <Button size="sm" className="mt-3 w-full" variant="secondary" asChild>
            <Link to="/app/billing" onClick={onNavigate}>
              {access ? "Manage billing" : "Subscribe now"}
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
  const ghost = useGhost();
  const identity = useIdentity("vendor");
  const { data: liveNotes } = useQuery({
    queryKey: ["notifications", ghost?.tenantId ?? "self"],
    queryFn: fetchNotifications,
    enabled: isSupabaseConfigured(),
  });
  const unread = (liveNotes ?? vendorNotifications).filter((n) => !n.read).length;
  const { data: access = true } = useQuery({
    queryKey: ["tenant-access"],
    queryFn: fetchTenantAccess,
    enabled: isSupabaseConfigured(),
  });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {ghost && (
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
            <span>
              Ghost session · viewing <strong>{ghost.business}</strong> as support
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              onClick={() => {
                stopGhost();
                window.location.href = "/admin/vendors";
              }}
            >
              Exit impersonation
            </Button>
          </div>
        )}
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
              <UserMenu identity={identity} kind="vendor" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {!access && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
              Subscription expired.{" "}
              <Link to="/app/billing" className="text-primary font-medium underline">
                Renew to continue selling
              </Link>
              .
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
