import { Clock, Layers, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KES } from "@/lib/mock-data";
import type { OpenSale } from "@/lib/data";

export function OpenSalesSheet({
  open,
  onOpenChange,
  sales,
  onResume,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: OpenSale[];
  onResume: (sale: OpenSale) => void;
  onDiscard: (sale: OpenSale) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Open sales</SheetTitle>
          <SheetDescription>
            Park a ticket to serve the next customer. Tap one to bring it back.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {sales.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No unfinished sales. Park the current cart or wait on M-Pesa, then serve the next
              person.
            </p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sale.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {sale.ref} · {sale.itemCount} item{sale.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={sale.status === "PENDING_PAYMENT" ? "default" : "outline"}>
                    {sale.status === "PENDING_PAYMENT" ? "Waiting M-Pesa" : "Parked"}
                  </Badge>
                </div>
                <p className="font-display mt-2 text-lg font-bold">{KES(sale.total)}</p>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                  <Clock className="size-3" />
                  {new Date(sale.createdAt).toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <Button size="sm" onClick={() => onResume(sale)}>
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDiscard(sale)}
                    aria-label={`Discard ${sale.label}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function OpenSalesButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Layers className="mr-2 size-4" />
      Open sales
      {count > 0 ? (
        <Badge className="ml-2 h-5 min-w-5 px-1.5">{count}</Badge>
      ) : null}
    </Button>
  );
}
