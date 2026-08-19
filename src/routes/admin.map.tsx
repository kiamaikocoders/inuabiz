import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/admin/StatusPill";
import { KES, tenants as mockTenants, type Tenant } from "@/lib/mock-data";
import { VendorMap } from "@/components/admin/VendorMap";
import { fetchTenants, startImpersonation } from "@/lib/data";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

export const Route = createFileRoute("/admin/map")({
  head: () => ({
    meta: [
      { title: "GIS store map — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Interactive Mapbox store map showing every vendor location with colour-coded status markers and regional density.",
      },
      { property: "og:title", content: "InuaBiz GIS store map" },
      { property: "og:description", content: "Every vendor plotted with live status markers." },
    ],
  }),
  component: StoreMap,
});

function StoreMap() {
  const navigate = useNavigate();
  const { data: tenantList = mockTenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });
  const [selected, setSelected] = useState<Tenant | null>(tenantList[0] ?? null);
  const current = selected ?? tenantList[0] ?? null;

  return (
    <AdminShell
      title="GIS store map"
      description="Vendor locations with live status markers"
      actions={
        <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
          {MAPBOX_TOKEN ? "Mapbox streets-v12" : "Token missing"}
        </Badge>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="surface-card overflow-hidden p-0">
          <VendorMap tenants={tenantList} selected={current} onSelect={setSelected} />
        </div>

        <div className="space-y-4">
          {current && (
            <div className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{current.business}</h2>
                  <p className="text-muted-foreground text-xs">
                    {current.owner} · {current.phone}
                  </p>
                </div>
                <StatusPill status={current.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Category", current.category],
                  ["Town", current.town],
                  ["Joined", current.joined],
                  ["MRR", current.mrr ? KES(current.mrr) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-muted/60 rounded-lg p-2.5">
                    <p className="text-muted-foreground text-[11px]">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>

              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => {
                  void startImpersonation(current).then(() => {
                    toast.success("Ghost session started", { description: current.business });
                    void navigate({ to: "/app" });
                  });
                }}
              >
                <Eye className="mr-2 size-4" /> Impersonate vendor
              </Button>
              <Button
                className="mt-2 w-full"
                variant="ghost"
                onClick={() =>
                  void navigate({
                    to: "/admin/tenants/$tenantId",
                    params: { tenantId: current.id },
                  })
                }
              >
                Open tenant record
              </Button>
            </div>
          )}

          <div className="surface-card p-5">
            <h2 className="inline-flex items-center gap-2 font-semibold">
              <MapPin className="text-primary size-4" /> Regional density
            </h2>
            <div className="mt-4 space-y-2">
              {Object.entries(
                tenantList.reduce<Record<string, number>>((acc, t) => {
                  acc[t.town] = (acc[t.town] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([town, count]) => (
                <div key={town} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{town}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
