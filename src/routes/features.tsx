import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Brain,
  FileText,
  Map,
  Package,
  ScanBarcode,
  ShieldCheck,
  Smartphone,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — POS, M-Pesa sync, credit ledger & AI | InuaBiz" },
      {
        name: "description",
        content:
          "Explore InuaBiz features: mobile POS with barcode scanning, M-Pesa multi-channel reconciliation, duka debt ledger, inventory alerts, AI insights and a super-admin command center.",
      },
      { property: "og:title", content: "InuaBiz features" },
      {
        property: "og:description",
        content:
          "Everything a Kenyan micro-vendor needs: POS, M-Pesa sync, credit ledger, inventory and AI insights.",
      },
    ],
  }),
  component: Features,
});

const vendorFeatures = [
  {
    icon: Store,
    title: "Mobile POS & checkout",
    body: "A fast product grid with search, instant cart totals, custom discounts and split payment options — designed for a counter, not a desktop.",
    points: ["Grid + search checkout", "Custom discounts", "Receipt by SMS or print"],
  },
  {
    icon: ScanBarcode,
    title: "Camera barcode scanning",
    body: "Use the phone camera as a scanner via the Web Barcode Detector API. No extra hardware, no extra cost.",
    points: ["Scan to add to cart", "Scan to receive stock", "Works offline-first"],
  },
  {
    icon: Smartphone,
    title: "M-Pesa multi-channel sync",
    body: "Parses confirmations across Paybill, Till, Pochi la Biashara and personal numbers, then matches each one to the right sale automatically.",
    points: ["STK push at checkout", "Auto-reconciliation", "Failed payment retry flow"],
  },
  {
    icon: BookOpen,
    title: "Duka debt / credit ledger",
    body: "Digitise kukopesha. Record credit in two taps, see outstanding balances per customer and send WhatsApp reminders on a schedule.",
    points: ["Per-customer balances", "Due date tracking", "Automated WhatsApp nudges"],
  },
  {
    icon: Package,
    title: "Inventory & stock alerts",
    body: "Real-time stock levels with reorder thresholds, low-stock push notifications and margin tracking on cost versus selling price.",
    points: ["Reorder levels", "Margin per product", "Stock movement history"],
  },
  {
    icon: Users,
    title: "Discrete loyalty tracking",
    body: "Frequent buyers are recognised by phone number. No physical cards, no app download required from your customers.",
    points: ["Visit and spend history", "Tier detection", "Quiet-customer alerts"],
  },
  {
    icon: Brain,
    title: "AI financial intelligence",
    body: "Predictive cash-flow forecasting, best-selling product predictions and reorder recommendations, written in plain language.",
    points: ["30-day cash-flow forecast", "Reorder advice", "Pricing and margin tips"],
  },
  {
    icon: FileText,
    title: "Invoices & receipts",
    body: "Issue wholesale invoices, track paid and overdue bills, and send digital receipts to every customer instantly.",
    points: ["Invoice statuses", "Bill Manager ready", "Digital receipts"],
  },
];

const adminFeatures = [
  {
    icon: Map,
    title: "Live GIS vendor map",
    body: "Every store plotted with colour-coded status markers — active, inactive, webhook error or suspended — plus regional density heatmaps.",
  },
  {
    icon: ShieldCheck,
    title: "One-click impersonation",
    body: "Open a shadow session into any vendor's view for live troubleshooting, without ever asking for their credentials.",
  },
  {
    icon: Wallet,
    title: "Unclaimed payment queue",
    body: "Inbound webhooks that failed tenant matching land here for one-click manual assignment to the correct vendor.",
  },
  {
    icon: Bell,
    title: "Health & broadcasts",
    body: "Database health, edge function latency, AI spend and a system-wide broadcast banner for all tenants.",
  },
];

function Features() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-8 sm:px-6">
          <Badge variant="secondary">Product tour</Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold sm:text-5xl">
            Every tool a small Kenyan shop needs, in one app
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
            InuaBiz replaces the ledger book, the mental stock count, the unverified M-Pesa text and
            the guesswork about next month's cash.
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {vendorFeatures.map((f) => (
              <div key={f.title} className="surface-card p-6">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                  <f.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {f.points.map((p) => (
                    <li
                      key={p}
                      className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase">
              For the platform operator
            </p>
            <h2 className="mt-3 text-3xl font-bold">Super-admin command center</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              Complete operational observability over every onboarded tenant — built for a solo
              operator running the whole platform.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {adminFeatures.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <span className="bg-gold/20 text-gold-foreground grid size-11 shrink-0 place-items-center rounded-xl">
                    <f.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/admin">Open admin demo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app">Open vendor demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
