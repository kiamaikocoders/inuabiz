import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  CircleHelp,
  Gauge,
  Mail,
  Map,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { adminNotifications, tenants, unclaimedPayments } from "@/lib/mock-data";
import { useIdentity } from "@/lib/identity";
import { UserMenu } from "@/components/app/UserMenu";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  well: string;
};

type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "COMMAND CENTER",
    items: [
      {
        to: "/admin",
        label: "Overview",
        icon: Gauge,
        exact: true,
        well: "bg-success text-white shadow-success/40",
      },
      {
        to: "/admin/vendors",
        label: "Vendors",
        icon: Store,
        badge: tenants.length,
        well: "bg-sky-500 text-white shadow-sky-500/40",
      },
      {
        to: "/admin/map",
        label: "GIS store map",
        icon: Map,
        well: "bg-violet-500 text-white shadow-violet-500/40",
      },
      {
        to: "/admin/unclaimed",
        label: "Unclaimed payments",
        icon: ShieldAlert,
        badge: unclaimedPayments.length,
        well: "bg-destructive text-white shadow-destructive/40",
      },
      {
        to: "/admin/ai",
        label: "Admin AI",
        icon: Sparkles,
        well: "bg-primary text-primary-foreground shadow-primary/40",
      },
    ],
  },
  {
    label: "REVENUE",
    items: [
      {
        to: "/admin/subscriptions",
        label: "Subscriptions & MRR",
        icon: Wallet,
        well: "bg-gold text-gold-foreground shadow-gold/40",
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        to: "/admin/health",
        label: "Platform health",
        icon: Activity,
        well: "bg-teal-500 text-white shadow-teal-500/40",
      },
      {
        to: "/admin/communications",
        label: "Communications",
        icon: Mail,
        well: "bg-orange-500 text-white shadow-orange-500/40",
      },
      {
        to: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        badge: adminNotifications.filter((n) => !n.read).length,
        well: "bg-info text-white shadow-info/40",
      },
      {
        to: "/admin/profile",
        label: "Profile",
        icon: UserRound,
        well: "bg-emerald-600 text-white shadow-emerald-600/40",
      },
      {
        to: "/admin/settings",
        label: "Settings",
        icon: Settings,
        well: "bg-slate-500 text-white shadow-slate-500/40",
      },
    ],
  },
];

const THEME_KEY = "inuabiz-admin-theme";

function isNavActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  if (item.to === "/admin/communications") {
    return (
      pathname.startsWith("/admin/communications") || pathname.startsWith("/admin/broadcasts")
    );
  }
  return pathname.startsWith(item.to);
}

function SidebarInner({
  onNavigate,
  query,
  onQueryChange,
  dark,
  onDarkChange,
}: {
  onNavigate?: (() => void) | undefined;
  query: string;
  onQueryChange: (value: string) => void;
  dark: boolean;
  onDarkChange: (value: boolean) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const matches = groups.flatMap((g) => g.items);
    if (matches.length === 1) {
      void navigate({ to: matches[0]!.to as never });
      onNavigate?.();
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5">
      <Logo />
      <form onSubmit={onSearch} className="relative mt-4">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          aria-label="Search admin pages"
          className="bg-admin-canvas h-10 rounded-xl border-0 pl-9 shadow-none"
        />
      </form>

      <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mt-3 first:mt-1">
            <p className="text-muted-foreground px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em]">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground font-medium",
                    )}
                  >
                    {active && (
                      <span className="bg-primary h-4 w-0.5 shrink-0 rounded-full" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg shadow-[0_6px_12px_-6px]",
                        item.well,
                        !active && "opacity-90",
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="bg-gold/20 text-gold-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted-foreground px-3 py-6 text-xs">No matching pages.</p>
        )}
      </nav>

      <div className="mt-4 space-y-2">
        <label className="flex items-center justify-between px-3 py-2 text-[13px] font-medium">
          Dark Mode
          <Switch checked={dark} onCheckedChange={onDarkChange} aria-label="Toggle dark mode" />
        </label>
        <Button variant="secondary" size="sm" className="h-10 w-full rounded-[10px]" asChild>
          <Link to="/app" onClick={onNavigate}>
            Exit to vendor view
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Shared admin chrome: light sidebar, page header, and notifications.
 */
export function AdminShell({
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
  const unread = adminNotifications.filter((n) => !n.read).length;
  const identity = useIdentity("admin");
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored ? stored === "dark" : prefersDark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  const onDarkChange = (value: boolean) => {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    window.localStorage.setItem(THEME_KEY, value ? "dark" : "light");
  };

  return (
    <div className="admin-app flex min-h-screen bg-admin-canvas">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner
          query={query}
          onQueryChange={setQuery}
          dark={dark}
          onDarkChange={onDarkChange}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-8">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border p-0">
                <SidebarInner
                  onNavigate={() => setMenuOpen(false)}
                  query={query}
                  onQueryChange={setQuery}
                  dark={dark}
                  onDarkChange={onDarkChange}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[22px] font-bold tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground hidden truncate text-xs sm:block">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <Button variant="secondary" size="icon" className="size-9 rounded-full" asChild>
                <Link to="/contact" aria-label="Help">
                  <CircleHelp className="size-[18px]" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="relative size-9 rounded-full"
                asChild
              >
                <Link to="/admin/notifications" aria-label="Notifications">
                  <Bell className="size-[18px]" />
                  {unread > 0 && (
                    <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
                  )}
                </Link>
              </Button>
              <UserMenu identity={identity} kind="admin" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
