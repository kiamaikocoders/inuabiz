import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  KES,
  type AdminNotificationDomain,
  type AdminNotificationItem,
  type NotificationItem,
} from "@/lib/mock-data";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/ops";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";

type DomainFilter = "all" | "critical" | AdminNotificationDomain;

const DOMAIN_AVATAR: Record<AdminNotificationDomain, string> = {
  unclaimed: "bg-destructive text-white",
  vendors: "bg-info text-white",
  subscriptions: "bg-gold text-gold-foreground",
  webhooks: "bg-orange-500 text-white",
  ai: "bg-sky-500 text-white",
  comms: "bg-violet-500 text-white",
  health: "bg-slate-500 text-white",
};

const SEVERITY: Record<AdminNotificationItem["priority"], { label: string; className: string }> = {
  CRITICAL: { label: "Critical", className: "bg-destructive/15 text-destructive" },
  HIGH: { label: "High", className: "bg-orange-50 text-[#fc7e19]" },
  NORMAL: { label: "Info", className: "bg-primary-soft text-primary" },
  LOW: { label: "Info", className: "bg-primary-soft text-primary" },
};

const RULES = [
  ["Unclaimed M-Pesa", "In-app + device; ops digest covers the rest"],
  ["New vendor", "In-app + device; counted in the daily ops digest"],
  ["Subscription paid", "In-app + device + PayHero email"],
  ["Sale / low stock", "Vendor till bell, in-app, device, optional email"],
  ["Broadcasts", "In-app banner + feed + device; email when that channel is on"],
  ["Contact form", "In-app + inbound email to ops"],
];

const DOMAIN_LABEL: Record<AdminNotificationDomain, string> = {
  unclaimed: "Unclaimed",
  vendors: "Vendors",
  subscriptions: "Subscriptions",
  webhooks: "Webhooks",
  ai: "Admin AI",
  comms: "Communications",
  health: "Health / System",
};

function inferDomain(n: NotificationItem): AdminNotificationDomain {
  const hay = `${n.title} ${n.message} ${n.type}`.toLowerCase();
  if (hay.includes("unclaimed")) return "unclaimed";
  if (n.type === "SUBSCRIPTION" || hay.includes("trial") || hay.includes("renew") || hay.includes("saas")) {
    return "subscriptions";
  }
  if (
    hay.includes("broadcast") ||
    hay.includes("newsletter") ||
    hay.includes("contact") ||
    hay.includes("wiring") ||
    hay.includes("email")
  ) {
    return "comms";
  }
  if (hay.includes("ai") || hay.includes("briefing") || hay.includes("copilot")) return "ai";
  if (hay.includes("webhook") || hay.includes("stk") || hay.includes("daraja") || hay.includes("payhero")) {
    return "webhooks";
  }
  if (hay.includes("vendor") || hay.includes("signup") || hay.includes("onboard") || hay.includes("joined")) {
    return "vendors";
  }
  return "health";
}

function metaStr(meta: Record<string, unknown> | null | undefined, key: string): string {
  if (!meta) return "";
  const v = meta[key];
  if (v == null || v === "") return "";
  return String(v);
}

function dayBucket(created: Date): { day: AdminNotificationItem["day"]; dayLabel: string } {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (created >= startOfToday) return { day: "today", dayLabel: "Today" };
  if (created >= startOfYesterday) return { day: "yesterday", dayLabel: "Yesterday" };
  return {
    day: "earlier",
    dayLabel: created.toLocaleDateString("en-KE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

type TenantEnrichment = {
  name: string;
  phone: string;
  owner: string;
  shop: string;
  status: string;
  plan: string;
  amount: number | null;
};

async function loadTenantEnrichment(
  tenantIds: string[],
): Promise<Map<string, TenantEnrichment>> {
  const map = new Map<string, TenantEnrichment>();
  if (!tenantIds.length || !isSupabaseConfigured()) return map;
  const sb = getSupabase();
  if (!sb) return map;

  const { data: tenants } = await sb
    .from("tenants")
    .select("id, name, phone, status")
    .in("id", tenantIds);
  const { data: shops } = await sb
    .from("shops")
    .select("tenant_id, name, is_default")
    .in("tenant_id", tenantIds)
    .order("created_at");
  const { data: owners } = await sb
    .from("profiles")
    .select("tenant_id, full_name, phone")
    .in("tenant_id", tenantIds)
    .eq("role", "VENDOR_ADMIN");
  const { data: subs } = await sb
    .from("subscriptions")
    .select("tenant_id, plan_code, amount, status")
    .in("tenant_id", tenantIds);

  const shopByTenant = new Map<string, string>();
  for (const s of shops ?? []) {
    const tid = s.tenant_id as string;
    if (!shopByTenant.has(tid) || s.is_default) {
      shopByTenant.set(tid, s.name as string);
    }
  }
  const ownerByTenant = new Map<string, { name: string; phone: string }>();
  for (const o of owners ?? []) {
    const tid = o.tenant_id as string;
    if (!ownerByTenant.has(tid)) {
      ownerByTenant.set(tid, {
        name: (o.full_name as string | null)?.trim() || "—",
        phone: (o.phone as string | null) ?? "",
      });
    }
  }
  const subByTenant = new Map<string, { plan: string; amount: number | null }>();
  for (const s of subs ?? []) {
    subByTenant.set(s.tenant_id as string, {
      plan: String(s.plan_code ?? "SHOP_MONTHLY"),
      amount: s.amount != null ? Number(s.amount) : null,
    });
  }

  for (const t of tenants ?? []) {
    const id = t.id as string;
    const owner = ownerByTenant.get(id);
    const sub = subByTenant.get(id);
    map.set(id, {
      name: (t.name as string) || "—",
      phone: (t.phone as string) || owner?.phone || "",
      owner: owner?.name ?? "—",
      shop: shopByTenant.get(id) ?? (t.name as string) ?? "—",
      status: String(t.status ?? ""),
      plan: sub?.plan ?? "",
      amount: sub?.amount ?? null,
    });
  }
  return map;
}

function planLabel(code: string): string {
  const c = code.toUpperCase();
  if (c === "COMPLIANCE") return "Compliance (ETR)";
  if (c === "SHOP_MONTHLY" || c === "STANDARD" || c === "FLAT_3000") return "Standard";
  return code || "—";
}

function buildAdminItems(
  notes: NotificationItem[],
  enrichment: Map<string, TenantEnrichment>,
): AdminNotificationItem[] {
  return notes.map((n) => {
    const domain = inferDomain(n);
    const created = n.createdAt ? new Date(n.createdAt) : new Date();
    const { day, dayLabel } = dayBucket(created);
    const stamp = created.toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meta = n.metadata ?? null;
    const tenantId =
      n.tenantId ||
      metaStr(meta, "tenant_id") ||
      (n.message.match(/Tenant\s+([0-9a-f-]{36})/i)?.[1] ?? "");
    const hit = tenantId ? enrichment.get(tenantId) : undefined;

    const phoneRaw = metaStr(meta, "phone") || hit?.phone || "";
    const phone = phoneRaw ? prettyKePhone(phoneRaw) : "—";
    const planCode = metaStr(meta, "plan_code") || hit?.plan || "";
    const plan = planCode ? planLabel(planCode) : "—";
    const invoice = metaStr(meta, "invoice_id") || metaStr(meta, "payhero_reference") || "—";
    const amountRaw = metaStr(meta, "amount");
    const amount =
      amountRaw && !Number.isNaN(Number(amountRaw))
        ? KES(Number(amountRaw))
        : hit?.amount != null
          ? KES(hit.amount)
          : "—";
    const email = metaStr(meta, "email") || "—";
    const contactId = metaStr(meta, "contact_id") || "—";
    const vendor =
      hit?.name ||
      n.message.match(/^(.+?)\s+joined InuaBiz/i)?.[1] ||
      (tenantId ? tenantId.slice(0, 8) + "…" : "—");
    const shop = hit?.shop || vendor;
    const owner = hit?.owner || "Ops";

    let primaryHref = "/admin/vendors";
    let primaryLabel = "Open vendors";
    let secondaryHref: string | undefined;
    let secondaryLabel: string | undefined;

    if (domain === "unclaimed") {
      primaryHref = "/admin/unclaimed";
      primaryLabel = "Open unclaimed";
    } else if (domain === "comms" && metaStr(meta, "href")) {
      primaryHref = metaStr(meta, "href");
      primaryLabel = "Open inbox";
    } else if (domain === "subscriptions" || domain === "vendors") {
      if (tenantId) {
        primaryHref = `/admin/tenants/${tenantId}`;
        primaryLabel = "Open vendor";
        secondaryHref = "/admin/subscriptions";
        secondaryLabel = "Subscriptions";
      } else {
        primaryHref = "/admin/subscriptions";
        primaryLabel = "Open subscriptions";
      }
    } else if (domain === "ai") {
      primaryHref = "/admin/ai";
      primaryLabel = "Open Admin AI";
    } else if (domain === "health" || domain === "webhooks") {
      primaryHref = "/admin/health";
      primaryLabel = "Open health";
    }

    const candidates: Array<[string, string]> = [
      ["Vendor", vendor],
      ["Shop", shop],
      ["Owner", owner],
      ["Phone", phone],
      ["Plan", plan],
      ["Amount", amount],
      ["Invoice / receipt", invoice],
      ["Email", email],
      ["Contact ID", contactId],
      ["Tenant ID", tenantId || "—"],
      ["Tenant status", hit?.status || "—"],
      ["Type", n.type],
      ["Priority", n.priority],
      ["Domain", DOMAIN_LABEL[domain]],
      ["Source", n.type.toLowerCase()],
      ["Read", n.read ? "Yes" : "No"],
      ["First seen", stamp],
      ["Last update", stamp],
    ];
    const alwaysShow = new Set([
      "Vendor",
      "Shop",
      "Owner",
      "Domain",
      "Source",
      "Type",
      "Priority",
      "Read",
      "First seen",
      "Last update",
    ]);
    const detailRows = candidates.filter(
      ([label, value]) => alwaysShow.has(label) || (value !== "—" && value !== ""),
    );

    const item: AdminNotificationItem = {
      ...n,
      domain,
      domainLabel: DOMAIN_LABEL[domain],
      day,
      dayLabel,
      clock: n.time,
      occurredAt: stamp,
      receivedDetail: stamp,
      firstSeen: stamp,
      lastUpdate: stamp,
      source: n.type.toLowerCase(),
      owner,
      tenant: vendor,
      shop,
      phone,
      plan,
      invoice,
      amount,
      email,
      contactId,
      primaryHref,
      primaryLabel,
      detailRows,
      tenantId: tenantId || n.tenantId,
    };
    if (secondaryHref && secondaryLabel) {
      item.secondaryHref = secondaryHref;
      item.secondaryLabel = secondaryLabel;
    }
    return item;
  });
}

async function fetchAdminFeed(): Promise<AdminNotificationItem[]> {
  const notes = await fetchNotifications();
  const tenantIds = [
    ...new Set(
      notes
        .map((n) => n.tenantId || metaStr(n.metadata, "tenant_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const enrichment = await loadTenantEnrichment(tenantIds);
  return buildAdminItems(notes, enrichment);
}

function letter(item: AdminNotificationItem): string {
  return item.domainLabel.charAt(0).toUpperCase();
}

function severityOf(item: AdminNotificationItem) {
  return SEVERITY[item.priority];
}

/**
 * AgriBeta-style notifications command centre: KPI strip, domain rail,
 * dated live feed and an event-detail pane — mapped onto InuaBiz ops.
 */
export function NotificationsCommandCenter() {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", "admin-feed"],
    queryFn: fetchAdminFeed,
  });
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const kpis = useMemo(() => {
    const unread = items.filter((n) => !n.read).length;
    const critical = items.filter((n) => n.priority === "CRITICAL").length;
    const unclaimed = items.filter((n) => n.domain === "unclaimed").length;
    const vendors = items.filter((n) => n.domain === "vendors").length;
    const platform = items.filter((n) => n.domain === "subscriptions" || n.domain === "comms").length;
    const system = items.filter((n) => n.domain === "health" || n.domain === "webhooks" || n.domain === "ai")
      .length;
    return { unread, critical, unclaimed, vendors, platform, system };
  }, [items]);

  const domainCounts = useMemo(() => {
    const count = (id: DomainFilter) => {
      if (id === "all") return items.length;
      if (id === "critical") return items.filter((n) => n.priority === "CRITICAL").length;
      return items.filter((n) => n.domain === id).length;
    };
    return [
      { id: "all" as const, label: "All activity" },
      { id: "critical" as const, label: "Critical only" },
      { id: "unclaimed" as const, label: "Unclaimed" },
      { id: "vendors" as const, label: "Vendors" },
      { id: "subscriptions" as const, label: "Subscriptions" },
      { id: "webhooks" as const, label: "Webhooks" },
      { id: "ai" as const, label: "Admin AI" },
      { id: "comms" as const, label: "Communications" },
      { id: "health" as const, label: "Health / System" },
    ].map((row) => ({ ...row, count: count(row.id) }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      const domainOk =
        domain === "all"
          ? true
          : domain === "critical"
            ? n.priority === "CRITICAL"
            : n.domain === domain;
      const textOk =
        !q ||
        `${n.title} ${n.message} ${n.tenant} ${n.shop} ${n.phone} ${n.plan} ${n.domainLabel}`
          .toLowerCase()
          .includes(q);
      return domainOk && textOk;
    });
  }, [items, domain, query]);

  const feedGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; rows: AdminNotificationItem[] }> = [];
    const today = filtered.filter((n) => n.day === "today");
    const yesterday = filtered.filter((n) => n.day === "yesterday");
    if (today.length) groups.push({ key: "today", label: "Today", rows: today });
    if (yesterday.length) groups.push({ key: "yesterday", label: "Yesterday", rows: yesterday });

    const earlier = filtered.filter((n) => n.day === "earlier");
    const byLabel = new Map<string, AdminNotificationItem[]>();
    for (const n of earlier) {
      const list = byLabel.get(n.dayLabel) ?? [];
      list.push(n);
      byLabel.set(n.dayLabel, list);
    }
    for (const [label, rows] of byLabel) {
      groups.push({ key: `earlier-${label}`, label, rows });
    }
    return groups;
  }, [filtered]);

  const selected = filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  const markRead = (id: string) => {
    void markNotificationRead(id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  };

  const markAllRead = () => {
    void markAllNotificationsRead()
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))
      .then(() => toast.success("All marked as read"));
  };

  return (
    <AdminShell
      title="Notifications"
      description="Command center · timed activity feed"
      actions={
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors, tills, events…"
            className="bg-muted hidden h-10 w-[240px] rounded-[10px] border-border text-xs sm:block"
          />
          <Button size="sm" className="rounded-[8px] px-3.5 text-xs font-semibold" onClick={markAllRead}>
            Mark all read
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-[8px] px-3.5 text-xs font-semibold">
                Rules
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification rules</DialogTitle>
                <DialogDescription>
                  Which platform events reach the command centre, and how.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-3">
                {RULES.map(([label, hint]) => (
                  <li key={label} className="flex items-start justify-between gap-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-muted-foreground text-right text-xs">{hint}</span>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {[
          { label: "Unread", value: kpis.unread, hint: "Needs attention", valueClass: "text-[#fc7e19]" },
          { label: "Critical", value: kpis.critical, hint: "Unclaimed + suspend", valueClass: "text-destructive" },
          { label: "M-Pesa", value: kpis.unclaimed, hint: "Unmatched tills", valueClass: "text-primary" },
          { label: "Vendors", value: kpis.vendors, hint: "Sign-up + suspend", valueClass: "text-info" },
          { label: "Platform", value: kpis.platform, hint: "Subs + comms", valueClass: "text-violet-500" },
          { label: "System", value: kpis.system, hint: "Health + webhooks", valueClass: "text-muted-foreground" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-muted-foreground text-[11px] font-medium">{card.label}</p>
            <p className={cn("mt-1.5 font-display text-[22px] font-bold leading-none", card.valueClass)}>
              {card.value}
            </p>
            <p className="text-muted-foreground mt-1.5 text-[11px]">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="rounded-xl border border-border bg-card p-3">
          <p className="text-muted-foreground mb-1 px-1 text-[10px] font-semibold tracking-wide">
            DOMAINS
          </p>
          {domainCounts.map((row) => {
            const active = domain === row.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setDomain(row.id);
                  setSelectedId("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs",
                  active
                    ? "border border-primary bg-primary-soft font-semibold text-primary"
                    : "font-medium text-foreground",
                )}
              >
                {row.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {row.count}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="flex min-h-[640px] flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Live activity feed</p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground font-medium">
                {filtered.length} event{filtered.length === 1 ? "" : "s"}
              </span>
              <span className="text-primary">Realtime</span>
            </div>
          </div>

          {filtered.length === 0 && (
            <p className="text-muted-foreground px-3 py-12 text-center text-sm">
              No notifications yet.
            </p>
          )}
          {feedGroups.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                {group.label}
              </p>
              {group.rows.map((n) => {
                const active = selected?.id === n.id;
                const sev = severityOf(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      "flex w-full gap-3 rounded-[10px] px-3.5 py-3 text-left",
                      active
                        ? "border border-primary bg-primary-soft"
                        : "border border-border bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-[10px] text-[14px] font-bold",
                        DOMAIN_AVATAR[n.domain],
                      )}
                    >
                      {letter(n)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-semibold">{n.title}</p>
                          <span className="text-muted-foreground shrink-0 text-xs">{n.time}</span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            sev.className,
                          )}
                        >
                          {sev.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-snug">{n.message}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-primary font-medium">{n.domainLabel}</span>
                        {n.tenant !== "—" ? (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{n.tenant}</span>
                          </>
                        ) : null}
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{n.clock}</span>
                        {!n.read ? (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#fc7e19]">
                            Unread
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </section>

        <aside className="rounded-xl border border-border bg-card p-4">
          {selected ? (
            <EventDetail
              item={selected}
              onMarkRead={() => {
                markRead(selected.id);
                toast.success("Marked as read");
              }}
            />
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">Select an event.</p>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function EventDetail({
  item,
  onMarkRead,
}: {
  item: AdminNotificationItem;
  onMarkRead: () => void;
}) {
  const sev = severityOf(item);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide">EVENT DETAIL</p>
      <p className="font-display text-base font-bold leading-snug">{item.title}</p>
      <div className="bg-primary-soft rounded-[10px] px-3 py-2.5">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide">
          NOTIFICATION TIME
        </p>
        <p className="mt-1 text-sm font-bold">{item.time}</p>
        <p className="text-primary mt-0.5 text-xs font-medium">{item.occurredAt}</p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">{item.dayLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", sev.className)}>
          {sev.label}
        </span>
        {!item.read ? (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#fc7e19]">
            Unread
          </span>
        ) : (
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold">
            Read
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{item.message}</p>
      <div className="divide-y divide-border rounded-[10px] border border-border">
        {item.detailRows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 px-3 py-2">
            <p className="text-muted-foreground shrink-0 text-[10px] font-medium">{label}</p>
            <p className="text-right text-xs font-semibold break-all">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Button size="sm" className="h-10 w-full rounded-[8px] text-xs font-semibold" asChild>
          <Link to={item.primaryHref as never}>{item.primaryLabel}</Link>
        </Button>
        {item.secondaryHref && item.secondaryLabel ? (
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-full rounded-[8px] text-xs font-semibold"
            asChild
          >
            <Link to={item.secondaryHref as never}>{item.secondaryLabel}</Link>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-full rounded-[8px] text-xs font-semibold"
          onClick={onMarkRead}
          disabled={item.read}
        >
          {item.read ? "Read" : "Mark as Read"}
        </Button>
      </div>
    </div>
  );
}
