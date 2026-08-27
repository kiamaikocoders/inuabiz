import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import type { HeatmapLayerSpecification } from "mapbox-gl";

type HeatPaint = NonNullable<HeatmapLayerSpecification["paint"]>;
import { MAPBOX_TOKEN, MAP_STYLE_LIGHT, NAIROBI } from "@/lib/mapbox";
import { type Tenant } from "@/lib/mock-data";
import { StatusPill } from "@/components/admin/StatusPill";
import { type BusinessCategory } from "@/lib/category";
import {
  categoryPinColor,
  STATUS_RING,
  type MapLayers,
} from "@/lib/map-legend";
import "mapbox-gl/dist/mapbox-gl.css";

const GOLD_FOREST = {
  "heatmap-radius": 36,
  "heatmap-intensity": 1.1,
  "heatmap-opacity": 0.72,
  "heatmap-color": [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(244,162,97,0)",
    0.15,
    "#F4A261",
    0.4,
    "#2A9D8F",
    0.7,
    "#0B6E4F",
    1,
    "#083D2E",
  ],
};

export function VendorMap({
  tenants,
  selected,
  onSelect,
  layers,
  categoryOf,
}: {
  tenants: Tenant[];
  selected: Tenant | null;
  onSelect: (t: Tenant | null) => void;
  layers: MapLayers;
  categoryOf: (t: Tenant) => BusinessCategory;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: tenants.map((t) => ({
        type: "Feature" as const,
        properties: { mrr: t.mrr, status: t.status },
        geometry: { type: "Point" as const, coordinates: [t.lng, t.lat] },
      })),
    }),
    [tenants],
  );

  useEffect(() => {
    if (!mounted || tenants.length === 0) return;
    const map = mapRef.current;
    if (!map) return;
    const lats = tenants.map((t) => t.lat);
    const lngs = tenants.map((t) => t.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (minLat === maxLat && minLng === maxLng) return;
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, maxZoom: 12, duration: 600 },
    );
  }, [mounted, tenants]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="grid h-full min-h-[28rem] place-items-center bg-muted p-6 text-center text-sm text-muted-foreground">
        Map preview needs <code className="mx-1">VITE_MAPBOX_ACCESS_TOKEN</code>
      </div>
    );
  }

  if (!mounted) {
    return <div className="bg-primary-soft h-full min-h-[28rem] w-full animate-pulse" />;
  }

  return (
    <div className="h-full min-h-[28rem] w-full">
      <Map
        ref={mapRef}
        initialViewState={NAIROBI}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE_LIGHT}
        attributionControl
        onClick={() => onSelect(null)}
      >
        <NavigationControl position="bottom-right" />
        <Source id="vendor-points" type="geojson" data={geojson}>
          {layers.density && (
            <Layer
              id="tenant-density"
              type="heatmap"
              paint={{ ...GOLD_FOREST, "heatmap-weight": 0.85 } as HeatPaint}
            />
          )}
          {layers.sales && (
            <Layer
              id="sales-heat"
              type="heatmap"
              paint={
                {
                  ...GOLD_FOREST,
                  "heatmap-weight": ["interpolate", ["linear"], ["get", "mrr"], 0, 0.15, 4500, 1],
                } as unknown as HeatPaint
              }
            />
          )}
          {layers.tills && (
            <Layer
              id="till-density"
              type="heatmap"
              paint={
                {
                  "heatmap-weight": 0.9,
                  "heatmap-radius": 28,
                  "heatmap-intensity": 1,
                  "heatmap-opacity": 0.65,
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(14,165,233,0)",
                    0.2,
                    "#7dd3fc",
                    0.55,
                    "#0ea5e9",
                    1,
                    "#0369a1",
                  ],
                } as unknown as HeatPaint
              }
            />
          )}
        </Source>
        {layers.stores &&
          tenants.map((t) => {
            const cat = categoryOf(t);
            return (
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
                  aria-label={`${t.business}, ${cat}`}
                  className="relative grid place-items-center"
                >
                  <span
                    className="size-3.5 rounded-full ring-2 ring-white"
                    style={{
                      background: categoryPinColor(cat),
                      boxShadow: `0 0 0 2.5px ${STATUS_RING[t.status]}`,
                    }}
                  />
                  {t.status === "Error" && (
                    <span className="absolute size-7 animate-ping rounded-full bg-red-500/40" />
                  )}
                </button>
              </Marker>
            );
          })}
        {selected && layers.stores && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={16}
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
