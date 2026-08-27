/** Reverse-geocode lat/lng to a short Kenyan-facing address label. */

export type GeoPoint = { lat: number; lng: number };

export function formatCoords(point: GeoPoint): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function mapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
}

/**
 * OpenStreetMap Nominatim — no key. Falls back to a pin label if the network fails.
 */
export async function reverseGeocode(point: GeoPoint): Promise<string> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lon", String(point.lng));
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return `Pin · ${formatCoords(point)}`;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const parts = [
      a["road"] || a["pedestrian"] || a["neighbourhood"] || a["suburb"],
      a["city"] || a["town"] || a["village"] || a["county"],
      a["state"],
    ].filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 3).join(",").trim();
    }
  } catch {
    /* offline / blocked */
  }
  return `Pin · ${formatCoords(point)}`;
}
