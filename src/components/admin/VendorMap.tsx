import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import { MAPBOX_TOKEN, MAP_STYLE_LIGHT, NAIROBI } from "@/lib/mapbox";
import { type Tenant } from "@/lib/mock-data";
import { StatusPill } from "@/components/admin/StatusPill";
import "mapbox-gl/dist/mapbox-gl.css";

const pinFill: Record<Tenant["status"], string> = {
  Active: "#16a34a",
  Trial: "#d97706",
  Error: "#dc2626",
  Suspended: "#78716c",
};

export function VendorMap({
  tenants,
  selected,
  onSelect,
}: {
  tenants: Tenant[];
  selected: Tenant | null;
  onSelect: (t: Tenant) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        Map preview needs <code className="mx-1">VITE_MAPBOX_ACCESS_TOKEN</code>
      </div>
    );
  }

  if (!mounted) {
    return <div className="bg-primary-soft aspect-[4/3] w-full animate-pulse" />;
  }

  return (
    <div className="aspect-[4/3] w-full">
      <Map
        initialViewState={NAIROBI}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE_LIGHT}
        attributionControl
      >
        <NavigationControl position="bottom-right" />
        {tenants.map((t) => (
          <Marker
            key={t.id}
            longitude={t.lng}
            latitude={t.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(t);
            }}
          >
            <button
              type="button"
              aria-label={t.business}
              className="relative grid place-items-center"
            >
              <span
                className="size-3.5 rounded-full ring-2 ring-white"
                style={{ background: pinFill[t.status] }}
              />
              {t.status === "Error" && (
                <span className="absolute size-7 animate-ping rounded-full bg-red-500/40" />
              )}
            </button>
          </Marker>
        ))}
        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={14}
            closeButton={false}
            closeOnClick={false}
          >
            <p className="text-sm font-semibold">{selected.business}</p>
            <p className="text-muted-foreground text-xs">
              {selected.town} · {selected.category}
            </p>
            <StatusPill status={selected.status} className="mt-1" />
          </Popup>
        )}
      </Map>
    </div>
  );
}
