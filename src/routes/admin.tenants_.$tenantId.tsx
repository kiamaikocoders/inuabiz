import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, MapPin, Phone, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { KES } from "@/lib/mock-data";
import { StatusPill } from "@/components/admin/StatusPill";
import { fetchTenant, startImpersonation } from "@/lib/data";
import { briefTenant } from "@/lib/admin-ai";

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

  const [brief, setBrief] = useState<{ summary: string; nextSteps: string[] } | null>(null);
  const [briefing, setBriefing] = useState(false);

  if (!tenant) {
    return (
      <AdminShell title="Tenant">
        <p className="text-muted-foreground text-sm">Tenant not found.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={tenant.business}
      description={`${tenant.owner} · ${tenant.town}`}
      actions={
        <Button
          size="sm"
          variant="ink"
          className="hidden rounded-[10px] sm:inline-flex"
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
        <div className="surface-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{tenant.business}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {tenant.owner} · {tenant.category}
              </p>
            </div>
            <StatusPill status={tenant.status} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Phone", tenant.phone],
              ["Town", tenant.town],
              ["Joined", tenant.joined],
              ["MRR", tenant.mrr ? KES(tenant.mrr) : "Trial"],
              ["Coordinates", `${tenant.lat.toFixed(4)}, ${tenant.lng.toFixed(4)}`],
              [
                "Auto-debit",
                (Number.parseInt(tenant.id.replace(/\D/g, ""), 10) - 1) % 3 === 0
                  ? "Ratiba on"
                  : "Manual STK",
              ],
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
        <div className="surface-card space-y-3 p-6">
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
    </AdminShell>
  );
}
