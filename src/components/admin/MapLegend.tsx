import { Checkbox } from "@/components/ui/checkbox";
import { HEAT_STOPS, STATUS_KEY, categoryOptions, type MapLayers } from "@/lib/map-legend";
import type { BusinessCategory } from "@/lib/category";

export function MapLegend({
  layers,
  onChange,
  presentCategories,
}: {
  layers: MapLayers;
  onChange: (next: MapLayers) => void;
  presentCategories: Set<BusinessCategory>;
}) {
  const cats = categoryOptions().filter((c) => presentCategories.has(c.id));
  const shown = cats.length > 0 ? cats : categoryOptions();

  return (
    <section
      aria-label="Map key"
      className="surface-card max-h-[min(70vh,36rem)] w-[min(100%,20.5rem)] overflow-y-auto p-4 shadow-lg"
    >
      <h2 className="font-display text-sm font-bold tracking-tight">Map key</h2>
      <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
        Pins are shop category. The ring is live status. Heat layers are density and volume.
      </p>

      <h3 className="text-muted-foreground mt-3 text-[10px] font-semibold tracking-wider uppercase">
        Layers
      </h3>
      <div className="mt-2 space-y-2">
        {(
          [
            ["stores", "Stores", "Category pins at each shop"],
            ["density", "Tenant density", "How tightly shops cluster"],
            ["sales", "Sales volume", "Weighted by subscription MRR"],
            ["tills", "M-Pesa till density", "Till / pay-in locations"],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="flex cursor-pointer items-start gap-2.5 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={layers[key]}
              onCheckedChange={(value) => onChange({ ...layers, [key]: value === true })}
            />
            <span>
              <span className="block text-xs font-medium leading-tight">{label}</span>
              <span className="text-muted-foreground block text-[11px] leading-tight">{hint}</span>
            </span>
          </label>
        ))}
      </div>

      <h3 className="text-muted-foreground mt-4 text-[10px] font-semibold tracking-wider uppercase">
        Category markers
      </h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
              style={{ background: c.color }}
              aria-hidden
            />
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </ul>

      <h3 className="text-muted-foreground mt-4 text-[10px] font-semibold tracking-wider uppercase">
        Status
      </h3>
      <ul className="mt-2 space-y-1.5">
        {STATUS_KEY.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2.5 shrink-0 rounded-full bg-card"
              style={{ boxShadow: `0 0 0 2px ${s.color}` }}
              aria-hidden
            />
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground">· {s.hint}</span>
          </li>
        ))}
      </ul>

      {(layers.density || layers.sales || layers.tills) && (
        <>
          <h3 className="text-muted-foreground mt-4 text-[10px] font-semibold tracking-wider uppercase">
            Volume scale
          </h3>
          <div className="mt-2">
            <div
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${HEAT_STOPS.map((s) => s.color).join(", ")})`,
              }}
              aria-hidden
            />
            <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
              <span>Low</span>
              <span>High</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
              Gold is sparse. Forest green is busy — more shops or higher MRR in that cell.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
