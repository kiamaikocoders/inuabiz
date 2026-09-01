export const SHOP_MONTHLY_KES = 3000;
export const TRIAL_DAYS = 3;
export const TYPICAL_TERMINAL_RENT_KES = 4500;

export const PAYMENT_EXPLAINERS: Record<string, string> = {
  till:
    "Buy Goods Till: customer pays your till number. InuaBiz matches the M-Pesa receipt to the open sale so your till screen turns green — no typing codes.",
  pochi:
    "Pochi la Biashara: our Android Companion listens for Safaricom payment SMS on the shop phone and posts the receipt to the open sale automatically.",
  personal_mpesa:
    "Personal M-Pesa: you can still sell on InuaBiz with cash or manual M-Pesa confirmation codes; STK push can also charge the customer phone when you use PayHero on subscription billing.",
  paybill:
    "Paybill: customer pays your paybill + account. C2B callbacks can land in InuaBiz when your paybill is registered — unmatched payments show in admin until mapped to your shop.",
};

export const BUSINESS_HINTS: Record<string, string> = {
  duka: "Track fast-moving SKU, duka debt (kukopesha), and low-stock alerts.",
  chemist: "Expiry dates on packs, reorder levels, and M-Pesa at the counter.",
  eatery: "Kitchen tickets, table tabs, and split bills when you add the eatery modules.",
  boutique: "Variants, barcode scan at POS, and daily sales export.",
  hardware: "Bulk items, credit book for contractors, and Till reconciliation.",
  other: "Inventory, M-Pesa till, and simple reports from your phone.",
};

export function roiEstimate(input: {
  txPerDay?: number;
  monthlySalesKes?: number;
  shopCount?: number;
}): {
  inuabizMonthlyKes: number;
  terminalRentEstimateKes: number;
  monthlySavingsKes: number;
  note: string;
} {
  const shops = Math.max(1, input.shopCount ?? 1);
  const inuabizMonthlyKes = shops * SHOP_MONTHLY_KES;
  const terminalRentEstimateKes = TYPICAL_TERMINAL_RENT_KES * shops;
  const monthlySavingsKes = Math.max(0, terminalRentEstimateKes - inuabizMonthlyKes);
  const tx = input.txPerDay ?? 0;
  const note =
    tx > 0
      ? `At ~${tx} sales/day on ${shops} shop(s): InuaBiz ≈ KES ${inuabizMonthlyKes}/mo vs typical terminal rent ≈ KES ${terminalRentEstimateKes}/mo.`
      : `Per shop: InuaBiz KES ${SHOP_MONTHLY_KES}/mo after ${TRIAL_DAYS}-day trial vs typical terminal rent KES ${TYPICAL_TERMINAL_RENT_KES}/mo.`;
  return { inuabizMonthlyKes, terminalRentEstimateKes, monthlySavingsKes, note };
}
