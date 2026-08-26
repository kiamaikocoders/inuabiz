export type TaxClass = "STANDARD_16" | "ZERO_RATED" | "EXEMPT";

export type TaxableLine = {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  taxClass: TaxClass;
  classificationCode?: string | null;
};

export type TaxBreakdown = {
  subtotalExVat: number;
  vat16Amount: number;
  vat0Amount: number;
  exemptAmount: number;
  total: number;
  lines: Array<TaxableLine & { net: number; vatAmount: number }>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Kenyan VAT-inclusive extract: VAT = amount × 16 / 116. */
export function vatInclusiveExtract(inclusive: number): number {
  return round2((inclusive * 16) / 116);
}

export function defaultTaxClassForCategory(category?: string | null): TaxClass {
  return String(category ?? "").toUpperCase() === "CHEMIST" ? "ZERO_RATED" : "STANDARD_16";
}

export function taxClassLabel(taxClass: TaxClass): string {
  if (taxClass === "STANDARD_16") return "Rate A (16% VAT)";
  if (taxClass === "ZERO_RATED") return "Rate B (0% zero-rated)";
  return "Rate C (Exempt)";
}

/**
 * Split a ticket into Rate A / B / C using inclusive pricing.
 * Discount is allocated proportionally across line totals (matches SQL issuer).
 */
export function calculateTax(lines: TaxableLine[], discountAmount = 0): TaxBreakdown {
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discount = Math.max(0, round2(discountAmount));
  const ratio = subtotal > 0 ? Math.max(0, 1 - discount / subtotal) : 1;

  let vat16 = 0;
  let vat0 = 0;
  let exempt = 0;
  let subtotalExVat = 0;

  const out: TaxBreakdown["lines"] = lines.map((line) => {
    const net = round2(line.lineTotal * ratio);
    let vatAmount = 0;
    if (line.taxClass === "STANDARD_16") {
      vatAmount = vatInclusiveExtract(net);
      vat16 += vatAmount;
      subtotalExVat += net - vatAmount;
    } else if (line.taxClass === "ZERO_RATED") {
      vat0 += net;
      subtotalExVat += net;
    } else {
      exempt += net;
      subtotalExVat += net;
    }
    return { ...line, net, vatAmount };
  });

  return {
    subtotalExVat: round2(subtotalExVat),
    vat16Amount: round2(vat16),
    vat0Amount: round2(vat0),
    exemptAmount: round2(exempt),
    total: round2(Math.max(0, subtotal - discount)),
    lines: out,
  };
}
