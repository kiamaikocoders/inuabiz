const KEY = "inuabiz:lastSale";

export type ReceiptLine = {
  name: string;
  qty: number;
  price: number;
  taxClass?: "STANDARD_16" | "ZERO_RATED" | "EXEMPT";
  note?: string;
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
  email?: string;
  merchantPhone?: string;
  vat16?: number;
  vat0?: number;
  exempt?: number;
  subtotalExVat?: number;
  mpesaReceipt?: string;
  when?: string;
  footer?: string;
  lines?: ReceiptLine[];
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
