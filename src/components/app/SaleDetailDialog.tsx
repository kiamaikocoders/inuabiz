import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { ReceiptCard, shareReceiptText } from "@/components/app/ReceiptCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchSaleReceipt } from "@/lib/ops";
import { mpesaCodeAndName } from "@/lib/mpesa-display";

export function SaleDetailDialog({
  saleId,
  onOpenChange,
}: {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale-receipt", saleId],
    queryFn: () => fetchSaleReceipt(saleId!),
    enabled: Boolean(saleId),
  });

  const onShare = () => {
    if (!sale) return;
    void shareReceiptText(sale)
      .then(() => {
        if (!navigator.share) toast.success("Receipt copied");
      })
      .catch(() => toast.error("Could not share the receipt"));
  };

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Sale details</DialogTitle>
          <DialogDescription>
            {sale?.mpesaReceipt
              ? mpesaCodeAndName(
                  sale.mpesaReceipt,
                  sale.mpesaPayerName ||
                    (sale.customer !== "Walk-in" && sale.customer !== "Walk-in Customer"
                      ? sale.customer
                      : null),
                )
              : sale?.ref ?? "Receipt and payment for this sale."}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-muted-foreground text-sm">Loading receipt…</p>}
        {!isLoading && !sale && (
          <p className="text-muted-foreground text-sm">Sale not found.</p>
        )}
        {sale && (
          <>
            <ReceiptCard sale={sale} showShare onShare={onShare} />
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print receipt
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
