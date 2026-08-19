import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KES, customers as mockCustomers } from "@/lib/mock-data";
import { fetchCustomers } from "@/lib/data";

export const Route = createFileRoute("/app/customers")({
  head: () => ({
    meta: [
      { title: "Customers & loyalty — InuaBiz" },
      {
        name: "description",
        content:
          "Discrete loyalty tracking by phone number: visit counts, lifetime spend, outstanding credit and quiet-customer alerts.",
      },
      { property: "og:title", content: "InuaBiz customers" },
      { property: "og:description", content: "Know your regulars without loyalty cards or apps." },
    ],
  }),
  component: Customers,
});

function Customers() {
  const [q, setQ] = useState("");
  const { data: customers = mockCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
  const rows = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\s/g, "").includes(q),
  );
  const lifetime = customers.reduce((s, c) => s + c.spend, 0);

  return (
    <AppShell title="Customers" description="Loyalty tracked quietly, by phone number">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Known customers" value={String(customers.length)} icon={Users} />
        <StatCard label="Lifetime spend" value={KES(lifetime)} delta={9} />
        <StatCard
          label="Loyal & VIP"
          value={String(customers.filter((c) => c.tier !== "Regular").length)}
          tone="gold"
        />
        <StatCard
          label="On credit"
          value={String(customers.filter((c) => c.debt > 0).length)}
          hint="see duka debt"
        />
      </div>

      <div className="mt-4">
        <div className="relative sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <Link key={c.id} to="/app/customers/$customerId" params={{ customerId: c.id }} className="surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-full text-sm font-bold">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-muted-foreground text-xs">{c.phone}</p>
                </div>
              </div>
              <Badge
                variant={c.tier === "VIP" ? "default" : c.tier === "Loyal" ? "secondary" : "outline"}
              >
                {c.tier}
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/60 rounded-lg py-2.5">
                <p className="font-display text-sm font-bold">{c.visits}</p>
                <p className="text-muted-foreground text-[11px]">visits</p>
              </div>
              <div className="bg-muted/60 rounded-lg py-2.5">
                <p className="font-display text-sm font-bold">{KES(c.spend)}</p>
                <p className="text-muted-foreground text-[11px]">spend</p>
              </div>
              <div className="bg-muted/60 rounded-lg py-2.5">
                <p
                  className={`font-display text-sm font-bold ${c.debt > 0 ? "text-destructive" : ""}`}
                >
                  {KES(c.debt)}
                </p>
                <p className="text-muted-foreground text-[11px]">owed</p>
              </div>
            </div>

            <p className="text-muted-foreground mt-4 text-xs">Last seen {c.lastSeen}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
