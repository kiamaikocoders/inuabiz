import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  ChartLine,
  CreditCard,
  FileText,
  FileUp,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  LifeBuoy,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { stopGhost, useGhost } from "@/lib/ghost";
import { useIdentity } from "@/lib/identity";
import { UserMenu } from "@/components/app/UserMenu";
import { useQuery } from "@tanstack/react-query";
import {
  fetchNotificationPrefs,
  fetchNotifications,
  fetchShops,
  fetchTenantAccess,
  setActiveShop,
} from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchProfile } from "@/lib/auth";
import { useShopCategory } from "@/hooks/use-shop-category";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { FeatureModule } from "@/lib/category";
import { NotificationLive } from "@/components/app/NotificationLive";
import { AppPermissionPrompts } from "@/components/app/AppPermissionPrompts";
import { SupportFloatingButton } from "@/components/app/SupportFloatingButton";
import { SupportTicketDialog } from "@/components/app/SupportTicketDialog";
import { BroadcastBanner } from "@/components/app/BroadcastBanner";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { fetchBillingSnapshot, vendorPlanBadge } from "@/lib/payments";
import { KES } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

type NavGroup = { label: string; items: NavItem[] };

const MODULE_ICON: Partial<Record<FeatureModule, LucideIcon>> = {
  table_management: LayoutGrid,
  order_queue: UtensilsCrossed,
  ticket_print: Ticket,
  expiry_alerts: CalendarClock,
};

function buildVendorNavGroups(
  category: string,
  categoryNav: Array<{ to: string; label: string; module: FeatureModule }>,
): NavGroup[] {
  const creditLabel = category === "DUKA" ? "Duka debt" : "Credit book";
  return [
    {
      label: "TILL",
      items: [
        { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/app/pos", label: "Point of sale", icon: Store },
        ...categoryNav.map((item) => ({
          to: item.to,
          label: item.label,
          icon: MODULE_ICON[item.module] ?? Store,
        })),
        { to: "/app/sales", label: "Sales", icon: Receipt },
      ],
    },
    {
      label: "SHOP",
      items: [
        { to: "/app/inventory", label: "Inventory", icon: Package },
        { to: "/app/credit", label: creditLabel, icon: CreditCard },
        { to: "/app/customers", label: "Customers", icon: Users },
        { to: "/app/invoices", label: "Invoices", icon: FileText },
      ],
    },
    {
      label: "INSIGHTS",
      items: [{ to: "/app/insights", label: "AI insights", icon: Sparkles }],
    },
    {
      label: "BUSINESS",
      items: [
        { to: "/app/shops", label: "Shops", icon: Store },
        { to: "/app/billing", label: "Subscription", icon: ChartLine },
        { to: "/app/import", label: "Import books", icon: FileUp },
      ],
    },
    {
      label: "ALERTS & SUPPORT",
      items: [
        { to: "/app/notifications", label: "Notifications", icon: Bell },
        { to: "/app/support", label: "Support", icon: LifeBuoy },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { to: "/app/settings", label: "Settings", icon: Settings },
        { to: "/app/profile", label: "Profile", icon: UserRound },
      ],
    },
  ];
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { def, category } = useShopCategory();
  const groups = buildVendorNavGroups(category, def.nav);

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
      {groups.map((group) => (
        <div key={group.label} className="mt-3 first:mt-0">
          <p className="text-sidebar-foreground/45 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em]">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
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
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarInner({
  onNavigate,
  dark,
  onDarkChange,
}: {
  onNavigate?: (() => void) | undefined;
  dark: boolean;
  onDarkChange: (value: boolean) => void;
}) {
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
  const { data: billing } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingSnapshot,
    enabled: isSupabaseConfigured(),
  });

  const planBadge = vendorPlanBadge(billing);
  const shopCount = Math.max(shops.length, 1);
  const amount = billing?.amount ?? 0;
  const perShop = shopCount > 0 && amount > 0 ? Math.round(amount / shopCount) : amount;
  const billingCopy = access
    ? billing
      ? `${planBadge} · ${KES(amount)} / month${
          shopCount > 1 ? ` (${shopCount} shops × ${KES(perShop)})` : ""
        }`
      : "Loading your plan…"
    : "Renew to keep POS, AI insights and reconciliation.";

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
      <div className="flex min-h-0 flex-1 flex-col">
        <NavList onNavigate={onNavigate} />
      </div>
      <div className="mt-auto space-y-3 px-4 pt-4">
        <label className="text-sidebar-foreground/80 flex items-center justify-between px-1 text-[13px] font-medium">
          Dark Mode
          <Switch checked={dark} onCheckedChange={onDarkChange} aria-label="Toggle dark mode" />
        </label>
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <p className="text-xs font-semibold text-sidebar-primary">
            {access ? "Subscription" : "Access locked"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">{billingCopy}</p>
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
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: fetchNotificationPrefs,
    enabled: isSupabaseConfigured(),
  });
  const unread =
    prefs?.channel_in_app === false ? 0 : (liveNotes ?? []).filter((n) => !n.read).length;
  const { data: access = true } = useQuery({
    queryKey: ["tenant-access"],
    queryFn: fetchTenantAccess,
    enabled: isSupabaseConfigured(),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [supportOpen, setSupportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { dark, onDarkChange } = useAppTheme();
  const showSupportFab = isSupabaseConfigured() && !ghost && !pathname.startsWith("/app/support");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner dark={dark} onDarkChange={onDarkChange} />
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
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
            <Link to="/app" className="shrink-0 lg:hidden" aria-label="InuaBiz home">
              <Logo showWord={false} />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold sm:text-lg">{title}</h1>
              {description && (
                <p className="text-muted-foreground hidden truncate text-xs sm:block">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:block">{actions}</div>
              <Button variant="ghost" size="icon" className="relative size-9" asChild>
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

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="left" className="w-72 border-sidebar-border p-0 lg:hidden">
            <SidebarInner
              dark={dark}
              onDarkChange={onDarkChange}
              onNavigate={() => setMoreOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main
          className={cn(
            "flex-1 p-3 sm:p-6",
            "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6",
          )}
        >
          <NotificationLive kind="vendor" />
          <AppPermissionPrompts />
          <OfflineBanner />
          <BroadcastBanner />
          {!access && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
              <p className="font-medium">Subscription expired — till writes are locked.</p>
              <p className="text-muted-foreground mt-1 text-xs">
                You can still view history. Renew to sell, edit inventory, or update customers.
              </p>
              <Link to="/app/billing" className="text-primary mt-2 inline-block font-medium underline">
                Renew to continue selling
              </Link>
            </div>
          )}
          <div
            className={cn(
              !access &&
                !pathname.startsWith("/app/billing") &&
                !pathname.startsWith("/app/support") &&
                !pathname.startsWith("/app/profile") &&
                "pointer-events-none select-none opacity-60",
            )}
          >
            {children}
          </div>
        </main>

        <MobileBottomNav onMore={() => setMoreOpen(true)} />

        {showSupportFab && (
          <>
            <SupportFloatingButton
              onClick={() => setSupportOpen(true)}
              className="bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6"
            />
            <SupportTicketDialog
              open={supportOpen}
              onOpenChange={setSupportOpen}
              onCreated={(ticketId) => {
                void navigate({ to: "/app/support", search: { ticket: ticketId } });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
