import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ReceiptCard, shareReceiptText } from "@/components/app/ReceiptCard";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/mock-data";
import { fetchSale } from "@/lib/data";
import { readLastSale, type LastSale } from "@/lib/last-sale";
import { useIdentity } from "@/lib/identity";

export const Route = createFileRoute("/app/sales_/$saleId")({
  head: () => ({
    meta: [{ title: "Sale detail — InuaBiz" }],
  }),
  component: SaleDetail,
});

function SaleDetail() {
  const { saleId } = Route.useParams();
  const identity = useIdentity("vendor");
  const last = readLastSale();
  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => fetchSale(saleId),
  });

  if (isLoading) {
    return (
      <AppShell title="Sale">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AppShell>
    );
  }

  if (!sale && last?.id !== saleId) {
    return (
      <AppShell title="Sale">
        <p className="text-muted-foreground text-sm">Sale not found.</p>
      </AppShell>
    );
  }

  const receipt: LastSale =
    last && (last.id === saleId || !sale)
      ? last
      : {
          id: sale!.id,
          ref: sale!.ref,
          total: sale!.total,
          items: sale!.items,
          channel: sale!.channel,
          customer: sale!.customer,
          phone: sale!.customer,
          shop: identity.shop,
          location: "Kasarani, Nairobi",
          when: `${sale!.time} EAT`,
          lines: products.slice(0, Math.max(sale!.items, 1)).map((p, i) => ({
            name: p.name,
            qty: i === 0 ? Math.max(sale!.items - (products.length > 1 ? 1 : 0), 1) : 1,
            price: p.price,
          })),
        };

  const onShare = () => {
    void shareReceiptText(receipt)
      .then(() => {
        if (!navigator.share) toast.success("Receipt copied");
      })
      .catch(() => toast.error("Could not share the receipt"));
  };

  return (
    <AppShell title={receipt.ref} description={sale ? `${sale.time} · ${sale.channel}` : receipt.channel}>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/app/sales">
          <ArrowLeft className="mr-1 size-4" /> All sales
        </Link>
      </Button>

      <ReceiptCard sale={receipt} showShare onShare={onShare} />
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
