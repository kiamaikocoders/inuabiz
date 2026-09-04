import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { KES, KES2 } from "@/lib/mock-data";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/verify-receipt")({
  validateSearch: (s: Record<string, unknown>) => ({
    cuin: typeof s.cuin === "string" ? s.cuin : "",
    inv: typeof s.inv === "string" ? s.inv : "",
  }),
  head: () => ({
    meta: [{ title: "Verify ETR-format receipt — InuaBiz" }],
  }),
  component: VerifyReceipt,
});

async function lookupReceipt(cuin: string, inv: string) {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return null;
  const { data, error } = await sb.rpc("verify_etr_receipt", {
    p_cuin: cuin || null,
    p_invoice: inv || null,
  });
  if (error || !data) return null;
  return data as {
    invoice_number: string;
    kra_control_number: string | null;
    customer_name: string;
    customer_kra_pin: string | null;
    subtotal: number;
    vat_16_amount: number;
    total_amount: number;
    created_at: string;
    shop_name: string | null;
    shop_kra_pin: string | null;
    shop_address: string | null;
  };
}

function VerifyReceipt() {
  const { cuin, inv } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["verify-receipt", cuin, inv],
    queryFn: () => lookupReceipt(cuin, inv),
    enabled: Boolean(cuin || inv),
  });

  return (
    <div className="bg-background min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo className="h-8" />
        </div>
        <div className="surface-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="text-primary size-5" />
            <h1 className="font-display text-lg font-bold">ETR-format receipt check</h1>
          </div>
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            This page confirms an InuaBiz-generated ETR-format record for your KRA filing pack. It is
            not a live eTIMS / KRA control-unit verification.
          </p>
          {!cuin && !inv && (
            <p className="text-destructive text-sm">Missing control number or invoice reference.</p>
          )}
          {isLoading && <p className="text-muted-foreground text-sm">Looking up…</p>}
          {!isLoading && (cuin || inv) && !data && (
            <p className="text-destructive text-sm">No matching ETR-format receipt found.</p>
          )}
          {data && (
            <div className="space-y-3 text-sm">
              <p className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="size-4" /> Record found in InuaBiz
              </p>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Shop</dt>
                  <dd className="font-medium text-right">{data.shop_name || "—"}</dd>
                </div>
                {data.shop_kra_pin && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Supplier KRA PIN</dt>
                    <dd className="font-medium">{data.shop_kra_pin}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Invoice</dt>
                  <dd className="font-medium">{data.invoice_number}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">CUIN</dt>
                  <dd className="font-medium">{data.kra_control_number || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium text-right">{data.customer_name}</dd>
                </div>
                {data.customer_kra_pin && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Buyer KRA PIN</dt>
                    <dd className="font-medium">{data.customer_kra_pin}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Taxable value</dt>
                  <dd>{KES2(Number(data.subtotal))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">VAT 16%</dt>
                  <dd>{KES2(Number(data.vat_16_amount))}</dd>
                </div>
                <div className="flex justify-between gap-3 font-semibold">
                  <dt>Total</dt>
                  <dd>{KES(Number(data.total_amount))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd>
                    {new Date(data.created_at).toLocaleString("en-KE", {
                      timeZone: "Africa/Nairobi",
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
