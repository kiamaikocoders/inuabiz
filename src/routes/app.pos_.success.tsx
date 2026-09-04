import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Store } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ReceiptCard, shareReceiptText } from "@/components/app/ReceiptCard";
import { Button } from "@/components/ui/button";
import { readLastSale } from "@/lib/last-sale";
import { fetchSaleReceipt } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/app/pos_/success")({
  head: () => ({
    meta: [{ title: "Sale complete — InuaBiz" }],
  }),
  component: SaleSuccess,
});

function SaleSuccess() {
  const navigate = useNavigate();
  const cached = readLastSale();
  const saleId = cached?.id;

  const { data: live } = useQuery({
    queryKey: ["sale-receipt", saleId],
    queryFn: () => fetchSaleReceipt(saleId!),
    enabled: Boolean(saleId) && isSupabaseConfigured() && !saleId?.startsWith("s-"),
  });

  const sale = live ?? cached;

  const onShare = () => {
    void shareReceiptText(sale)
      .then(() => {
        if (!navigator.share) toast.success("Receipt copied");
      })
      .catch(() => toast.error("Could not share the receipt"));
  };

  return (
    <AppShell
      title="Sale complete"
      description="Receipt and next steps"
      actions={
        <Button variant="ghost" size="sm" className="text-primary hidden sm:inline-flex" onClick={onShare}>
          Share
        </Button>
      }
    >
      <ReceiptCard sale={sale} showShare onShare={onShare} />
      <div className="mx-auto mt-3 grid w-full max-w-[390px] gap-2">
        <Button size="lg" className="h-12 rounded-xl" onClick={() => void navigate({ to: "/app/pos" })}>
          <Store className="mr-2 size-4" /> New sale
        </Button>
        <Button variant="outline" asChild>
          {sale ? (
            <Link to="/app/sales/$saleId" params={{ saleId: sale.id }}>
              View sale
            </Link>
          ) : (
            <Link to="/app/sales">View sales</Link>
          )}
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Print receipt
        </Button>
      </div>
    </AppShell>
  );
}
