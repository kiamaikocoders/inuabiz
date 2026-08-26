/**
 * Shop business category — the only vertical flag.
 * Do not introduce a separate "niche" field; category drives modules, nav and POS.
 */

export const BUSINESS_CATEGORIES = [
  "DUKA",
  "BOUTIQUE",
  "CHEMIST",
  "HARDWARE",
  "EATERY",
  "ELECTRONICS",
  "AGRITECH",
  "SERVICES",
  "OTHER",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export type FeatureModule =
  | "serial_tracking"
  | "imei_tracking"
  | "warranty"
  | "variant_specs"
  | "batch_tracking"
  | "expiry_alerts"
  | "prescription"
  | "dosage"
  | "tax_rate_bc"
  | "table_management"
  | "order_queue"
  | "ticket_print"
  | "service_duration"
  | "bulk_units"
  | "seasonal_lots";

export type PosLayout =
  | "retail"
  | "chemist"
  | "electronics"
  | "eatery"
  | "services"
  | "hardware"
  | "boutique"
  | "agritech";

export type CategoryNavItem = {
  to: string;
  label: string;
  module: FeatureModule;
};

export type CategoryDef = {
  id: BusinessCategory;
  label: string;
  blurb: string;
  posTitle: string;
  posHint: string;
  searchPlaceholder: string;
  inventoryHint: string;
  emoji: string;
  posLayout: PosLayout;
  modules: FeatureModule[];
  nav: CategoryNavItem[];
};

export const CATEGORY_CATALOG: Record<BusinessCategory, CategoryDef> = {
  DUKA: {
    id: "DUKA",
    label: "Duka",
    blurb: "General retail till — fast SKU grid, stock and duka debt.",
    posTitle: "Point of sale",
    posHint: "Tap products to add them to the cart",
    searchPlaceholder: "Search product or SKU…",
    inventoryHint: "Stock levels, reorder points and margins",
    emoji: "🏪",
    posLayout: "retail",
    modules: [],
    nav: [],
  },
  BOUTIQUE: {
    id: "BOUTIQUE",
    label: "Boutique",
    blurb: "Apparel and beauty — size, colour and variant specs on each piece.",
    posTitle: "Boutique till",
    posHint: "Pick the size and colour before you bag it",
    searchPlaceholder: "Search piece, SKU or size…",
    inventoryHint: "Pieces, variants and reorder points",
    emoji: "👗",
    posLayout: "boutique",
    modules: ["variant_specs"],
    nav: [],
  },
  CHEMIST: {
    id: "CHEMIST",
    label: "Chemist",
    blurb: "Pharmacy counter — batch, expiry, dosage and Rate B / C tax.",
    posTitle: "Dispensary till",
    posHint: "Watch expiry dates. Rate B and C print on the ETR.",
    searchPlaceholder: "Search medicine, SKU or batch…",
    inventoryHint: "Batches, expiry and classification codes",
    emoji: "💊",
    posLayout: "chemist",
    modules: ["batch_tracking", "expiry_alerts", "prescription", "dosage", "tax_rate_bc"],
    nav: [{ to: "/app/expiry", label: "Expiry", module: "expiry_alerts" }],
  },
  HARDWARE: {
    id: "HARDWARE",
    label: "Hardware",
    blurb: "Building supplies — bags, kilos and pieces with bulk units.",
    posTitle: "Hardware till",
    posHint: "Sell by bag, kilo or piece. Quantity first.",
    searchPlaceholder: "Search item, SKU or unit…",
    inventoryHint: "Units, bulk stock and reorder points",
    emoji: "🔧",
    posLayout: "hardware",
    modules: ["bulk_units"],
    nav: [],
  },
  EATERY: {
    id: "EATERY",
    label: "Restaurant / eatery",
    blurb: "Tables, kitchen queue and kitchen tickets from the same till.",
    posTitle: "Floor till",
    posHint: "Seat a table, send the ticket to the kitchen, print when ready",
    searchPlaceholder: "Search menu item…",
    inventoryHint: "Menu items, portions and prep stock",
    emoji: "🍽️",
    posLayout: "eatery",
    modules: ["table_management", "order_queue", "ticket_print"],
    nav: [
      { to: "/app/floor", label: "Floor", module: "table_management" },
      { to: "/app/kitchen", label: "Kitchen", module: "order_queue" },
    ],
  },
  ELECTRONICS: {
    id: "ELECTRONICS",
    label: "Electronics",
    blurb: "Phones and gadgets — serial, IMEI, warranty and spec models.",
    posTitle: "Electronics till",
    posHint: "Capture serial or IMEI at checkout. Warranty rides on the receipt.",
    searchPlaceholder: "Search model, serial or IMEI…",
    inventoryHint: "Serials, IMEI, warranty and variants",
    emoji: "📱",
    posLayout: "electronics",
    modules: ["serial_tracking", "imei_tracking", "warranty", "variant_specs"],
    nav: [],
  },
  AGRITECH: {
    id: "AGRITECH",
    label: "Agritech",
    blurb: "Farm inputs — lots, season tags and expiry on agrochemicals.",
    posTitle: "Farm-input till",
    posHint: "Sell by lot and season. Flag anything close to expiry.",
    searchPlaceholder: "Search input, lot or season…",
    inventoryHint: "Lots, seasons and expiry",
    emoji: "🌱",
    posLayout: "agritech",
    modules: ["batch_tracking", "expiry_alerts", "seasonal_lots"],
    nav: [{ to: "/app/expiry", label: "Expiry", module: "expiry_alerts" }],
  },
  SERVICES: {
    id: "SERVICES",
    label: "Services",
    blurb: "Salons, repair and clinics — duration billing and job tickets.",
    posTitle: "Service desk",
    posHint: "Bill by duration, then print or park a job ticket",
    searchPlaceholder: "Search service…",
    inventoryHint: "Services, duration and prices",
    emoji: "✂️",
    posLayout: "services",
    modules: ["service_duration", "ticket_print"],
    nav: [{ to: "/app/tickets", label: "Tickets", module: "ticket_print" }],
  },
  OTHER: {
    id: "OTHER",
    label: "Other",
    blurb: "Closest general till when none of the named categories fit.",
    posTitle: "Point of sale",
    posHint: "Tap products to add them to the cart",
    searchPlaceholder: "Search product or SKU…",
    inventoryHint: "Stock levels, reorder points and margins",
    emoji: "🏬",
    posLayout: "retail",
    modules: [],
    nav: [],
  },
};

export const CATEGORY_LIST: CategoryDef[] = BUSINESS_CATEGORIES.map(
  (id) => CATEGORY_CATALOG[id],
);

const LABEL_TO_ID: Record<string, BusinessCategory> = Object.fromEntries(
  CATEGORY_LIST.flatMap((c) => [
    [c.id, c.id],
    [c.label.toUpperCase(), c.id],
    [c.id.replace(/_/g, " "), c.id],
  ]),
) as Record<string, BusinessCategory>;

/** Accept enum ids, old title-case labels, or free text. Always returns a catalog id. */
export function parseCategory(raw?: string | null): BusinessCategory {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, "_");
  if ((BUSINESS_CATEGORIES as readonly string[]).includes(key)) {
    return key as BusinessCategory;
  }
  if (key === "RESTAURANT" || key === "RESTAURANT_EATERY") return "EATERY";
  if (key === "PHARMACY" || key === "PHARMACY_CHEMIST") return "CHEMIST";
  if (key === "AGRICULTURE" || key === "AGRI") return "AGRITECH";
  if (key === "ELECTRONIC") return "ELECTRONICS";
  if (key === "SERVICE") return "SERVICES";
  return LABEL_TO_ID[key] ?? LABEL_TO_ID[String(raw ?? "").trim().toUpperCase()] ?? "DUKA";
}

export function categoryDef(raw?: string | null): CategoryDef {
  return CATEGORY_CATALOG[parseCategory(raw)];
}

export function categoryLabel(raw?: string | null): string {
  return categoryDef(raw).label;
}

export function categoryHasModule(raw: string | null | undefined, module: FeatureModule): boolean {
  return categoryDef(raw).modules.includes(module);
}

export type ProductAttrs = {
  department?: string;
  serial_number?: string;
  imei?: string;
  warranty_months?: string;
  variant_spec?: string;
  size?: string;
  color?: string;
  batch_number?: string;
  expiry_date?: string;
  dosage?: string;
  prescription_required?: boolean;
  duration_minutes?: string;
  unit?: string;
  season?: string;
};

export function emptyProductAttrs(): ProductAttrs {
  return {};
}

export function daysUntilExpiry(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export const DEMO_CATEGORY_KEY = "inuabiz:demo-category";

export function readDemoCategory(): BusinessCategory {
  if (typeof window === "undefined") return "DUKA";
  return parseCategory(window.localStorage.getItem(DEMO_CATEGORY_KEY));
}

export function writeDemoCategory(id: BusinessCategory): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_CATEGORY_KEY, id);
}
