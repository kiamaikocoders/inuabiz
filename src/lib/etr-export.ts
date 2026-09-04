import type { LastSale } from "@/lib/last-sale";
import { calculateTax, type TaxClass } from "@/lib/tax";

/** KRA eTIMS sales payload shape (OSCU/VSCU) — ready for future API submit / manual export. */
export type EtimsExportPayload = {
  tin: string;
  bhfId: string;
  invcNo: number;
  orgInvcNo: number;
  custTin: string;
  custNm: string;
  salesTyCd: "N";
  rcptTyCd: "S";
  pmtTyCd: string;
  cfmDt: string;
  salesDt: string;
  totItemCnt: number;
  taxblAmtA: number;
  taxblAmtB: number;
  taxblAmtC: number;
  taxAmtA: number;
  taxAmtB: number;
  taxAmtC: number;
  totTaxblAmt: number;
  totTaxAmt: number;
  totAmt: number;
  remark: string;
  itemList: Array<{
    itemSeq: number;
    itemCd: string;
    itemNm: string;
    pkgUnitCd: string;
    qty: number;
    prc: number;
    splyAmt: number;
    dcAmt: number;
    vatCatCd: "A" | "B" | "C";
    vatTaxblAmt: number;
    vatAmt: number;
    totAmt: number;
  }>;
  /** InuaBiz local control fields for forwarding until live eTIMS signs the receipt */
  meta: {
    saleId: string;
    invoiceNumber: string;
    cuin: string | null;
    qrUrl: string | null;
    supplierName: string;
    supplierAddress: string;
    supplierPhone: string | null;
    exportedAt: string;
    transmission: "PENDING_EXPORT";
  };
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pmtTyCd(channel: string): string {
  const c = channel.toLowerCase();
  if (c.includes("cash")) return "01";
  if (c.includes("credit")) return "02";
  if (c.includes("mpesa") || c.includes("mobile") || c.includes("till") || c.includes("paybill")) {
    return "06";
  }
  return "07";
}

function vatCat(taxClass?: TaxClass | string): "A" | "B" | "C" {
  if (taxClass === "ZERO_RATED") return "B";
  if (taxClass === "EXEMPT") return "C";
  return "A";
}

function invcNoFromRef(ref: string, fallbackId: string): number {
  const digits = ref.replace(/\D/g, "");
  if (digits.length) return Number(digits.slice(-8)) || 0;
  const hex = fallbackId.replace(/\D/g, "").slice(0, 8);
  return Number.parseInt(hex || "0", 16) % 1_0000_0000;
}

function taxFromSale(sale: LastSale) {
  const lines = sale.lines ?? [];
  const computed = calculateTax(
    lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPrice: l.price,
      lineTotal: l.price * l.qty,
      taxClass: (l.taxClass as TaxClass) ?? "STANDARD_16",
      classificationCode: l.classificationCode ?? null,
    })),
  );

  // Prefer per-line from calculateTax for export itemList
  const vat16 =
    sale.vat16 != null && (Number(sale.vat16) > 0 || computed.vat16Amount === 0)
      ? Number(sale.vat16)
      : computed.vat16Amount;
  const vat0 = sale.vat0 != null ? Number(sale.vat0) : computed.vat0Amount;
  const exempt = sale.exempt != null ? Number(sale.exempt) : computed.exemptAmount;
  const subtotal =
    sale.subtotalExVat != null && Number(sale.subtotalExVat) > 0
      ? Number(sale.subtotalExVat)
      : computed.subtotalExVat;

  return { vat16, vat0, exempt, subtotal, lines: computed.lines };
}

/**
 * Build an eTIMS-shaped sales payload from an InuaBiz Compliance receipt.
 * Vendors can download this JSON and forward it into eTIMS / their tax agent.
 */
export function buildEtimsExportPayload(sale: LastSale): EtimsExportPayload {
  const tax = taxFromSale(sale);
  const now = new Date();
  const iso = sale.isoWhen ?? now.toISOString();
  const day = iso.slice(0, 10).replace(/-/g, "");
  const tin = (sale.kraPin ?? "").trim().toUpperCase();
  const custTin = (sale.customerKraPin ?? "").trim().toUpperCase();

  const rateATaxable = round2(Math.max(0, tax.subtotal - tax.vat0 - tax.exempt));
  // Prefer exclusive of VAT for Rate A taxable from inclusive extract
  const rateAExclusive = round2(tax.subtotal - tax.vat0 - tax.exempt);
  const taxblA = rateAExclusive > 0 ? rateAExclusive : rateATaxable;

  return {
    tin: tin || "MISSING_SELLER_PIN",
    bhfId: sale.branchId ?? "00",
    invcNo: invcNoFromRef(sale.ref, sale.id),
    orgInvcNo: 0,
    custTin: custTin || "",
    custNm: sale.customer || "Walk-in Customer",
    salesTyCd: "N",
    rcptTyCd: "S",
    pmtTyCd: pmtTyCd(sale.channel),
    cfmDt: iso.replace(/[-:TZ.]/g, "").slice(0, 14),
    salesDt: day,
    totItemCnt: tax.lines.length,
    taxblAmtA: taxblA,
    taxblAmtB: round2(tax.vat0),
    taxblAmtC: round2(tax.exempt),
    taxAmtA: round2(tax.vat16),
    taxAmtB: 0,
    taxAmtC: 0,
    totTaxblAmt: round2(tax.subtotal),
    totTaxAmt: round2(tax.vat16),
    totAmt: round2(sale.total),
    remark: sale.controlNumber ? `CUIN ${sale.controlNumber}` : "InuaBiz ETR export",
    itemList: tax.lines.map((line, idx) => {
      const cat = vatCat(line.taxClass);
      const exclusive =
        cat === "A" ? round2(line.net - line.vatAmount) : round2(line.net);
      return {
        itemSeq: idx + 1,
        itemCd: line.classificationCode?.trim() || `KE${String(idx + 1).padStart(8, "0")}`,
        itemNm: line.name,
        pkgUnitCd: "U",
        qty: line.qty,
        prc: round2(line.unitPrice),
        splyAmt: round2(line.net),
        dcAmt: 0,
        vatCatCd: cat,
        vatTaxblAmt: exclusive,
        vatAmt: round2(line.vatAmount),
        totAmt: round2(line.net),
      };
    }),
    meta: {
      saleId: sale.id,
      invoiceNumber: sale.ref,
      cuin: sale.controlNumber ?? null,
      qrUrl: sale.qrUrl ?? null,
      supplierName: sale.legalName || sale.shop || "",
      supplierAddress: sale.location || "",
      supplierPhone: sale.merchantPhone ?? null,
      exportedAt: now.toISOString(),
      transmission: "PENDING_EXPORT",
    },
  };
}

export function downloadEtimsExport(sale: LastSale): void {
  const payload = buildEtimsExportPayload(sale);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etims-export-${payload.meta.invoiceNumber || sale.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyEtimsExport(sale: LastSale): Promise<void> {
  const payload = buildEtimsExportPayload(sale);
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}
