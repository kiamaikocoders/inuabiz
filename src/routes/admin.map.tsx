import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KES, statusColor, tenants, type Tenant } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/map")({
  head: () => ({
    meta: [
      { title: "GIS store map — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Interactive store map showing every vendor location with colour-coded status markers and regional density.",
      },
      { property: "og:title", content: "InuaBiz GIS store map" },
      { property: "og:description", content: "Every vendor plotted with live status markers." },
    ],
  }),
  component: StoreMap,
});

const markerColor: Record<Tenant["status"], string> = {
  Active: "bg-success",
  Trial: "bg-warning",
  Error: "bg-destructive",
  Suspended: "bg-muted-foreground",
};

function StoreMap() {
  const [selected, setSelected] = useState<Tenant | null>(tenants[0] ?? null);

  return (
    <AdminShell
      title="GIS store map"
      description="Vendor locations with live status markers"
      actions={
        <Badge variant="outline" className="hidden sm:inline-flex">
          Mapbox wiring pending
        </Badge>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="surface-card overflow-hidden p-0">
          <div className="relative aspect-[4/3] w-full bg-primary-soft">
            <div className="grid-paper absolute inset-0 opacity-60" aria-hidden />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 35% 40%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 45%), radial-gradient(circle at 62% 68%, color-mix(in oklab, var(--color-gold) 28%, transparent), transparent 40%)",
              }}
              aria-hidden
            />
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                style={{ top: `${t.lat}%`, left: `${t.lng}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                aria-label={t.business}
              >
                <span className="relative grid place-items-center">
                  <span
                    className={cn(
                      "size-3.5 rounded-full ring-2 ring-background transition-transform",
                      markerColor[t.status],
                      selected?.id === t.id && "scale-150",
                    )}
                  />
                  {t.status === "Error" && (
                    <span className="bg-destructive/40 absolute size-7 animate-ping rounded-full" />
                  )}
                </span>
              </button>
            ))}

            <div className="bg-card/95 absolute bottom-3 left-3 rounded-xl border border-border p-3 text-xs shadow-soft">
              <p className="font-semibold">Status</p>
              <div className="mt-2 space-y-1.5">
                {(["Active", "Trial", "Error", "Suspended"] as const).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", markerColor[s])} />
                    <span className="text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selected && (
            <div className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{selected.business}</h2>
                  <p className="text-muted-foreground text-xs">
                    {selected.owner} · {selected.phone}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    statusColor[selected.status],
                  )}
                >
                  {selected.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Category", selected.category],
                  ["Town", selected.town],
                  ["Joined", selected.joined],
                  ["MRR", selected.mrr ? KES(selected.mrr) : "—"],
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
                onClick={() =>
                  toast.info("Impersonation session", {
                    description: `Shadow session into ${selected.business}.`,
                  })
                }
              >
                <Eye className="mr-2 size-4" /> Impersonate vendor
              </Button>
            </div>
          )}

          <div className="surface-card p-5">
            <h2 className="inline-flex items-center gap-2 font-semibold">
              <MapPin className="text-primary size-4" /> Regional density
            </h2>
            <div className="mt-4 space-y-2">
              {Object.entries(
                tenants.reduce<Record<string, number>>((acc, t) => {
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
