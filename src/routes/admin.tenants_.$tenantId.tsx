import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Eye, MapPin, Phone, Sparkles, Store, Ticket, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KES } from "@/lib/mock-data";
import { StatusPill } from "@/components/admin/StatusPill";
import { fetchTenant, startImpersonation } from "@/lib/data";
import { briefTenant } from "@/lib/admin-ai";
import {
  fetchAdminCategoryDesk,
  shopCategoriesLabel,
  shopsForTenant,
  tenantModules,
} from "@/lib/admin-category";
import { categoryDef, moduleLabel } from "@/lib/category";

export const Route = createFileRoute("/admin/tenants_/$tenantId")({
  head: () => ({
    meta: [{ title: "Vendor tenant — InuaBiz admin" }],
  }),
  component: TenantDetail,
});

function TenantDetail() {
  const { tenantId } = Route.useParams();
  const navigate = useNavigate();
  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenant(tenantId),
  });
  const { data: desk } = useQuery({
    queryKey: ["admin-category-desk"],
    queryFn: fetchAdminCategoryDesk,
  });

  const [brief, setBrief] = useState<{ summary: string; nextSteps: string[] } | null>(null);
  const [briefing, setBriefing] = useState(false);

  if (!tenant) {
    return (
      <AdminShell title="Tenant">
        <p className="text-muted-foreground text-sm">Tenant not found.</p>
      </AdminShell>
    );
  }

  const shops = shopsForTenant(desk?.shops ?? [], tenantId);
  const modules = tenantModules(shops);
  const expiry = (desk?.expiry ?? []).filter((r) => r.tenantId === tenantId);
  const tickets = (desk?.tickets ?? []).filter((r) => r.tenantId === tenantId);
  const floor = (desk?.floor ?? []).filter((r) => r.tenantId === tenantId);
  const dueSoon = expiry.filter((r) => r.days <= 30);

  return (
    <AdminShell
      title={tenant.business}
      description={`${tenant.owner} · ${tenant.town}`}
      actions={
        <Button
          size="sm"
          variant="ink"
          className="rounded-[10px]"
          onClick={() => {
            void startImpersonation(tenant).then(() => {
              toast.success("Ghost session started", { description: tenant.business });
              void navigate({ to: "/app" });
            });
          }}
        >
          <Eye className="size-3.5" /> Impersonate
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="surface-card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{tenant.business}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {tenant.owner} · {shopCategoriesLabel(shops) || tenant.category}
              </p>
            </div>
            <StatusPill status={tenant.status} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Phone", tenant.phone],
              ["Town", tenant.town],
              ["Joined", tenant.joined],
              ["MRR", tenant.mrr ? KES(tenant.mrr) : "Trial"],
              ["Coordinates", `${tenant.lat.toFixed(4)}, ${tenant.lng.toFixed(4)}`],
              ["Billing", tenant.status === "Active" ? "Daraja STK / shop" : "Trial or locked"],
            ].map(([k, v]) => (
              <div key={k} className="bg-muted/60 rounded-lg p-3">
                <p className="text-muted-foreground text-[11px]">{k}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 inline-flex items-center gap-1.5 text-xs">
            <MapPin className="size-3.5" /> Plotted on the GIS store map
          </p>
        </div>
        <div className="surface-card space-y-3 p-4 sm:p-6">
          <h3 className="font-semibold">Support actions</h3>
          <p className="text-muted-foreground text-sm">
            Impersonation opens the vendor app with a ghost bar. An audit row is written when you
            are signed in as super-admin.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              void startImpersonation(tenant).then(() => {
                toast.success("Ghost session started", { description: tenant.business });
                void navigate({ to: "/app" });
              });
            }}
          >
            <Eye className="mr-2 size-4" /> Impersonate vendor
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={briefing}
            onClick={() => {
              setBriefing(true);
              void briefTenant(tenant)
                .then(setBrief)
                .catch((err: unknown) =>
                  toast.error("Brief failed", {
                    description: err instanceof Error ? err.message : "Try again",
                  }),
                )
                .finally(() => setBriefing(false));
            }}
          >
            <Sparkles className="mr-2 size-4" /> {briefing ? "Briefing…" : "AI support brief"}
          </Button>
          {brief && (
            <div className="bg-muted/60 rounded-xl p-3 text-sm">
              <p className="leading-relaxed">{brief.summary}</p>
              <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-xs">
                {brief.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" className="w-full" asChild>
            <a href={`tel:${tenant.phone}`}>
              <Phone className="mr-2 size-4" /> Call {tenant.phone}
            </a>
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <a href={`/admin/map`}>
              <Store className="mr-2 size-4" /> Show on GIS map
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface-card flex items-center gap-3 p-4">
          <CalendarClock className="text-destructive size-5 shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">Expiring in 30 days</p>
            <p className="font-semibold">{dueSoon.length}</p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-3 p-4">
          <Ticket className="text-gold size-5 shrink-0" />
          <div>
            <p className="text-muted-foreground text-[11px]">Open tickets</p>
            <p className="font-semibold">{tickets.length}</p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-3 p-4">
          <UtensilsCrossed className="size-5 shrink-0 text-violet-500" />
          <div>
            <p className="text-muted-foreground text-[11px]">Tables seated / billing</p>
            <p className="font-semibold">{floor.length}</p>
          </div>
        </div>
      </div>

      <section className="surface-card mt-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Shops & till modules</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/categories">All categories</Link>
          </Button>
        </div>
        {shops.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            No shops on file. Org category label: {tenant.category}.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {shops.map((shop) => {
              const def = categoryDef(shop.category);
              return (
                <li
                  key={shop.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {def.emoji} {shop.name}
                      {shop.isDefault ? (
                        <span className="text-muted-foreground ml-2 text-[11px]">default</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {def.label}
                      {shop.address ? ` · ${shop.address}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {def.modules.length ? (
                      def.modules.map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px] font-normal">
                          {moduleLabel(m)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        core till
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {modules.length > 0 && (
          <p className="text-muted-foreground mt-3 text-xs">
            This org can run: {modules.map(moduleLabel).join(", ")}.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
