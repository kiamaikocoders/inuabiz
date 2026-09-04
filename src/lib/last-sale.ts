const KEY = "inuabiz:lastSale";

export type ReceiptLine = {
  name: string;
  qty: number;
  price: number;
  taxClass?: "STANDARD_16" | "ZERO_RATED" | "EXEMPT";
  classificationCode?: string | null;
  note?: string;
  imageUrl?: string | null;
};

export type LastSale = {
  id: string;
  ref: string;
  total: number;
  items: number;
  channel: string;
  customer: string;
  phone?: string;
  shop?: string;
  location?: string;
  legalName?: string;
  kraPin?: string;
  customerKraPin?: string;
  email?: string;
  merchantPhone?: string;
  vat16?: number;
  vat0?: number;
  exempt?: number;
  subtotalExVat?: number;
  mpesaReceipt?: string;
  mpesaPayerName?: string;
  status?: "Complete" | "Pending" | "Failed";
  when?: string;
  /** ISO timestamp for eTIMS export (salesDt / cfmDt) */
  isoWhen?: string;
  footer?: string;
  logoUrl?: string | null;
  lines?: ReceiptLine[];
  /** COMPLIANCE plan — ETR-format receipt chrome */
  etrFormat?: boolean;
  controlNumber?: string | null;
  qrUrl?: string | null;
  /** eTIMS branch office id — default 00 until shop settings exist */
  branchId?: string;
  tenderCurrency?: string;
  fxRate?: number;
  foreignAmount?: number;
};

export function saveLastSale(sale: LastSale): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(sale));
}

export function readLastSale(): LastSale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastSale) : null;
  } catch {
    return null;
  }
}
