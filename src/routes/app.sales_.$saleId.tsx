import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ReceiptCard, shareReceiptText } from "@/components/app/ReceiptCard";
import { Button } from "@/components/ui/button";
import { fetchSaleReceipt } from "@/lib/ops";
import { readLastSale } from "@/lib/last-sale";

export const Route = createFileRoute("/app/sales_/$saleId")({
  head: () => ({
    meta: [{ title: "Sale detail — InuaBiz" }],
  }),
  component: SaleDetail,
});

function SaleDetail() {
  const { saleId } = Route.useParams();
  const last = readLastSale();
  const { data: receipt, isLoading } = useQuery({
    queryKey: ["sale-receipt", saleId],
    queryFn: () => fetchSaleReceipt(saleId),
  });

  const live = receipt ?? (last?.id === saleId ? last : null);

  if (isLoading && !live) {
    return (
      <AppShell title="Sale">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AppShell>
    );
  }

  if (!live) {
    return (
      <AppShell title="Sale">
        <p className="text-muted-foreground text-sm">Sale not found.</p>
      </AppShell>
    );
  }

  const onShare = () => {
    void shareReceiptText(live)
      .then(() => {
        if (!navigator.share) toast.success("Receipt copied");
      })
      .catch(() => toast.error("Could not share the receipt"));
  };

  return (
    <AppShell title={live.ref} description={`${live.when ?? ""} · ${live.channel}`}>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/app/sales">
          <ArrowLeft className="mr-1 size-4" /> All sales
        </Link>
      </Button>

      <ReceiptCard sale={live} showShare onShare={onShare} />
      <div className="mx-auto mt-3 grid w-full max-w-[390px] gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Print receipt
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/pos">Repeat on POS</Link>
        </Button>
      </div>
    </AppShell>
  );
}
