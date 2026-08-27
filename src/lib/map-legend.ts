import type { BusinessCategory } from "@/lib/category";
import { CATEGORY_LIST } from "@/lib/category";
import type { Tenant } from "@/lib/mock-data";

export type MapLayers = {
  stores: boolean;
  density: boolean;
  sales: boolean;
  tills: boolean;
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  stores: true,
  density: true,
  sales: false,
  tills: false,
};

/** Category pin fills — unique colour per shop type. */
export const CATEGORY_PIN: Record<BusinessCategory, string> = {
  DUKA: "#0B6E4F",
  CHEMIST: "#0ea5e9",
  BOUTIQUE: "#F4A261",
  HARDWARE: "#ea580c",
  EATERY: "#e11d48",
  ELECTRONICS: "#7c3aed",
  AGRITECH: "#65a30d",
  SERVICES: "#0d9488",
  OTHER: "#64748b",
};

export const STATUS_RING: Record<Tenant["status"], string> = {
  Active: "#16a34a",
  Trial: "#d97706",
  Error: "#dc2626",
  Suspended: "#78716c",
};

export const STATUS_KEY: { id: Tenant["status"]; label: string; hint: string; color: string }[] = [
  { id: "Active", label: "Active", hint: "Live connection", color: STATUS_RING.Active },
  { id: "Trial", label: "Trial", hint: "Pending first bill", color: STATUS_RING.Trial },
  { id: "Error", label: "Error", hint: "Sync / till issue", color: STATUS_RING.Error },
  { id: "Suspended", label: "Suspended", hint: "Offline", color: STATUS_RING.Suspended },
];

export const HEAT_STOPS = [
  { color: "#F4A261", label: "Low" },
  { color: "#2A9D8F", label: "Mid" },
  { color: "#0B6E4F", label: "High" },
] as const;

export function categoryPinColor(id: BusinessCategory): string {
  return CATEGORY_PIN[id] ?? CATEGORY_PIN.OTHER;
}

export function categoryOptions(): { id: BusinessCategory; label: string; color: string }[] {
  return CATEGORY_LIST.map((c) => ({
    id: c.id,
    label: c.label,
    color: CATEGORY_PIN[c.id],
  }));
}
