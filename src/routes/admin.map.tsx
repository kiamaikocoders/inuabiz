import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/admin/StatusPill";
import { KES, type Tenant } from "@/lib/mock-data";
import { VendorMap } from "@/components/admin/VendorMap";
import { MapLegend } from "@/components/admin/MapLegend";
import { fetchTenants, startImpersonation } from "@/lib/data";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { fetchAdminShops, shopCategoriesLabel, shopsForTenant } from "@/lib/admin-category";
import { parseCategory, type BusinessCategory } from "@/lib/category";
import { DEFAULT_MAP_LAYERS, type MapLayers } from "@/lib/map-legend";

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
  const { data: tenantList = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: fetchTenants,
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: fetchAdminShops,
  });
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_MAP_LAYERS);
  const [legendOpen, setLegendOpen] = useState(true);
  const current = selected;

  const categoryOf = (t: Tenant): BusinessCategory => {
    const shop = shopsForTenant(shops, t.id)[0];
    return shop?.category ?? parseCategory(t.category);
  };

  const presentCategories = useMemo(() => {
    const set = new Set<BusinessCategory>();
    for (const t of tenantList) set.add(categoryOf(t));
    return set;
    // shops is used inside categoryOf
  }, [tenantList, shops]);

  return (
    <AdminShell
      title="GIS store map"
      description="Vendor locations with live status markers"
      contentClassName="p-0 sm:p-0 overflow-hidden"
      actions={
        <Badge variant="outline" className="rounded-full">
          {MAPBOX_TOKEN ? "Mapbox streets-v12" : "Token missing"}
        </Badge>
      }
    >
      <div className="relative h-[calc(100dvh-72px)] w-full">
        <VendorMap
          tenants={tenantList}
          selected={current}
          onSelect={setSelected}
          layers={layers}
          categoryOf={categoryOf}
        />

        <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
          <div className="pointer-events-auto absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-auto lg:bottom-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mb-2 lg:hidden"
              onClick={() => setLegendOpen((open) => !open)}
            >
              <KeyRound className="mr-1.5 size-3.5" />
              {legendOpen ? "Hide map key" : "Map key"}
            </Button>
            <div className={legendOpen ? "block" : "hidden lg:block"}>
              <MapLegend
                layers={layers}
                onChange={setLayers}
                presentCategories={presentCategories}
              />
            </div>
          </div>

          {current && (
            <div className="pointer-events-auto surface-card absolute top-3 right-3 max-h-[min(52vh,28rem)] w-[min(100%-1.5rem,22rem)] overflow-y-auto p-5 shadow-lg sm:top-4 sm:right-4">
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
                  [
                    "Category",
                    shopCategoriesLabel(shopsForTenant(shops, current.id)) || current.category,
                  ],
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
        </div>
      </div>
    </AdminShell>
  );
}
