import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CategoryRouteGate } from "@/components/category/CategoryRouteGate";
import { StatusEmpty } from "@/components/status/StatusPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysUntilExpiry } from "@/lib/category";
import { fetchProducts } from "@/lib/data";
import { useShopCategory } from "@/hooks/use-shop-category";

export const Route = createFileRoute("/app/expiry")({
  head: () => ({ meta: [{ title: "Expiry — InuaBiz" }] }),
  component: () => (
    <CategoryRouteGate module="expiry_alerts">
      <ExpiryPage />
    </CategoryRouteGate>
  ),
});

function ExpiryPage() {
  const { def } = useShopCategory();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const rows = products
    .map((p) => ({ product: p, days: daysUntilExpiry(p.attrs?.expiry_date) }))
    .filter((r) => r.days != null)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  return (
    <AppShell
      title="Expiry"
      description={`${def.label} lots approaching or past their date`}
      actions={
        <Button size="sm" asChild>
          <Link to="/app/inventory">Inventory</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <StatusEmpty
          icon={CalendarClock}
          title="No expiry dates on file"
          description="Add an expiry date on a product to watch it here."
          primary={{ label: "Add product", to: "/app/inventory/new" }}
        />
      ) : (
        <ul className="surface-card divide-y divide-border">
          {rows.map(({ product, days }) => (
            <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-muted-foreground text-xs">
                  {product.attrs?.batch_number
                    ? `Lot ${product.attrs.batch_number}`
                    : product.sku}
                  {product.attrs?.expiry_date ? ` · ${product.attrs.expiry_date}` : ""}
                </p>
              </div>
              <Badge variant={(days ?? 0) <= 30 ? "destructive" : "outline"}>
                {days != null && days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
