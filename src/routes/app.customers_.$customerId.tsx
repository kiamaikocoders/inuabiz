import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KES } from "@/lib/mock-data";
import { fetchCreditBook, fetchCustomer, fetchSales } from "@/lib/data";

export const Route = createFileRoute("/app/customers_/$customerId")({
  head: () => ({
    meta: [{ title: "Customer — InuaBiz" }],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => fetchCustomer(customerId),
  });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const { data: debts = [] } = useQuery({ queryKey: ["credit-book"], queryFn: fetchCreditBook });

  if (!customer) {
    return (
      <AppShell title="Customer">
        <p className="text-muted-foreground text-sm">Customer not found.</p>
      </AppShell>
    );
  }

  const relatedSales = sales.filter(
    (s) =>
      s.customer.toLowerCase().includes(customer.name.split(" ")[0]!.toLowerCase()) ||
      (customer.phone && s.customer.replace(/\s/g, "").includes(customer.phone.replace(/\s/g, ""))),
  );
  const relatedDebt = debts.filter((d) => d.phone === customer.phone || d.id === customer.id);

  return (
    <AppShell title={customer.name} description={customer.phone}>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/app/customers">
          <ArrowLeft className="mr-1 size-4" /> All customers
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-primary-soft text-primary grid size-12 place-items-center rounded-full text-sm font-bold">
                {customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <h2 className="font-semibold">{customer.name}</h2>
                <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <Phone className="size-3" /> {customer.phone}
                </p>
              </div>
            </div>
            <Badge>{customer.tier}</Badge>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/60 rounded-xl py-3">
              <p className="font-display text-lg font-bold">{customer.visits}</p>
              <p className="text-muted-foreground text-[11px]">visits</p>
            </div>
            <div className="bg-muted/60 rounded-xl py-3">
              <p className="font-display text-lg font-bold">{KES(customer.spend)}</p>
              <p className="text-muted-foreground text-[11px]">lifetime</p>
            </div>
            <div className="bg-muted/60 rounded-xl py-3">
              <p className={`font-display text-lg font-bold ${customer.debt > 0 ? "text-destructive" : ""}`}>
                {KES(customer.debt)}
              </p>
              <p className="text-muted-foreground text-[11px]">owed</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">Last seen {customer.lastSeen}</p>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <h3 className="font-semibold">Credit</h3>
            {relatedDebt.length === 0 && (
              <p className="text-muted-foreground mt-2 text-sm">No open credit.</p>
            )}
            {relatedDebt.map((d) => (
              <div key={d.id} className="mt-3 flex justify-between text-sm">
                <span>{d.due}</span>
                <span className="font-semibold">{KES(d.amount)}</span>
              </div>
            ))}
            {customer.debt > 0 && (
              <Button size="sm" className="mt-4 w-full" asChild>
                <Link to="/app/credit">Open duka debt</Link>
              </Button>
            )}
          </div>
          <div className="surface-card p-5">
            <h3 className="font-semibold">Recent sales</h3>
            <div className="mt-3 space-y-2">
              {relatedSales.length === 0 && (
                <p className="text-muted-foreground text-sm">No matching sales on this till.</p>
              )}
              {relatedSales.map((s) => (
                <Link
                  key={s.id}
                  to="/app/sales/$saleId"
                  params={{ saleId: s.id }}
                  className="flex justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted"
                >
                  <span>{s.ref}</span>
                  <span className="font-semibold">{KES(s.total)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
