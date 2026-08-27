import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CircleCheck,
  CircleSlash,
  Eye,
  Hourglass,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, tenants as mockTenants } from "@/lib/mock-data";
import { fetchTenants, startImpersonation } from "@/lib/data";
import { fetchAdminShops, shopCategoriesLabel } from "@/lib/admin-category";
import { CATEGORY_LIST, parseCategory, type BusinessCategory } from "@/lib/category";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Every onboarded tenant with status, shop categories, location, MRR and one-click impersonation for live support.",
      },
      { property: "og:title", content: "InuaBiz vendor directory" },
      { property: "og:description", content: "Manage every tenant with one-click impersonation." },
    ],
  }),
  component: Vendors,
});

function Vendors() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState<BusinessCategory | "ALL">("ALL");
  const { data: tenants = mockTenants } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: fetchTenants,
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: fetchAdminShops,
  });

  const shopsByTenant = useMemo(() => {
    const map = new Map<string, typeof shops>();
    for (const shop of shops) {
      const list = map.get(shop.tenantId) ?? [];
      list.push(shop);
      map.set(shop.tenantId, list);
    }
    return map;
  }, [shops]);

  const rows = tenants.filter((t) => {
    if (tab !== "all" && t.status.toLowerCase() !== tab) return false;
    const local = shopsByTenant.get(t.id) ?? [];
    const shopLabel = shopCategoriesLabel(local);
    if (cat !== "ALL") {
      const hit =
        local.some((s) => s.category === cat) || parseCategory(t.category) === cat;
      if (!hit) return false;
    }
    const hay = `${t.business} ${t.owner} ${t.town} ${t.category} ${shopLabel}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <AdminShell
      title="Vendors"
      description="All onboarded tenants — filter by the shop category the till actually runs"
      actions={
        <Button
          size="sm"
          variant="ink"
          className="rounded-[10px]"
          onClick={() =>
            toast.message("Invite vendor", {
              description: "Self-serve onboarding is already live. Share the signup link.",
            })
          }
        >
          <Plus className="size-3.5" /> Invite vendor
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tenants"
          value={String(tenants.length)}
          icon={Store}
          delta={12}
          tone="violet"
        />
        <StatCard
          label="Active"
          value={String(tenants.filter((t) => t.status === "Active").length)}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="On trial"
          value={String(tenants.filter((t) => t.status === "Trial").length)}
          icon={Hourglass}
          tone="gold"
        />
        <StatCard
          label="Needs attention"
          value={String(
            tenants.filter((t) => t.status === "Error" || t.status === "Suspended").length,
          )}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="surface-card mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 overflow-x-auto pb-1">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto min-w-max">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="trial">Trial</TabsTrigger>
                <TabsTrigger value="error">Error</TabsTrigger>
                <TabsTrigger value="suspended">Suspended</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search business, owner, town, category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCat("ALL")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              cat === "ALL" ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            All categories
          </button>
          {CATEGORY_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                cat === c.id ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shops</TableHead>
                <TableHead>Town</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const local = shopsByTenant.get(t.id) ?? [];
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/admin/tenants/$tenantId"
                        params={{ tenantId: t.id }}
                        className="hover:underline"
                      >
                        {t.business}
                      </Link>
                    </TableCell>
                    <TableCell>{t.owner}</TableCell>
                    <TableCell className="text-muted-foreground">{t.phone}</TableCell>
                    <TableCell>
                      {local.length
                        ? `${local.length} · ${shopCategoriesLabel(local)}`
                        : t.category}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.town}</TableCell>
                    <TableCell className="text-muted-foreground">{t.joined}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {t.mrr ? KES(t.mrr) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void startImpersonation(t).then(() => {
                            toast.success("Ghost session started", { description: t.business });
                            void navigate({ to: "/app" });
                          });
                        }}
                      >
                        <Eye className="mr-1.5 size-4" /> Impersonate
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <StatusEmpty
                      icon={CircleSlash}
                      title="No results match"
                      description="Try a different search, or clear filters and browse the vendor directory."
                      primary={{
                        label: "Clear filters",
                        onClick: () => {
                          setQ("");
                          setTab("all");
                          setCat("ALL");
                        },
                      }}
                      secondary={{ label: "GIS store map", to: "/admin/map" }}
                      meta="0 results"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ul className="mt-4 space-y-2 md:hidden">
          {rows.map((t) => {
            const local = shopsByTenant.get(t.id) ?? [];
            return (
              <li key={t.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/admin/tenants/$tenantId"
                    params={{ tenantId: t.id }}
                    className="min-w-0 font-semibold hover:underline"
                  >
                    {t.business}
                  </Link>
                  <StatusPill status={t.status} />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t.owner} · {t.town}
                </p>
                <p className="mt-1 text-xs">
                  {local.length
                    ? `${local.length} shop${local.length === 1 ? "" : "s"} · ${shopCategoriesLabel(local)}`
                    : t.category}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t.mrr ? KES(t.mrr) : "Trial"}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void startImpersonation(t).then(() => {
                        toast.success("Ghost session started", { description: t.business });
                        void navigate({ to: "/app" });
                      });
                    }}
                  >
                    <Eye className="mr-1.5 size-4" /> Impersonate
                  </Button>
                </div>
              </li>
            );
          })}
          {rows.length === 0 && (
            <StatusEmpty
              icon={CircleSlash}
              title="No results match"
              description="Try a different search, or clear filters."
              primary={{
                label: "Clear filters",
                onClick: () => {
                  setQ("");
                  setTab("all");
                  setCat("ALL");
                },
              }}
            />
          )}
        </ul>
      </div>
    </AdminShell>
  );
}
