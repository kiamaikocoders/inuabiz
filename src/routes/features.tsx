import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Brain,
  Building2,
  FileText,
  Mail,
  Package,
  ScanBarcode,
  Smartphone,
  Store,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import { breadcrumbJsonLd, pageHead, softwareApplicationJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/features")({
  head: () =>
    pageHead({
      title: "InuaBiz features — POS, M-Pesa, credit & stock for Kenya dukas",
      description:
        "See what InuaBiz includes: mobile POS, M-Pesa STK/Till/Paybill reconciliation, kukopesha credit, inventory alerts, extra shops, staff roles, wholesale invoices and AI restock.",
      path: "/features",
      ogTitle: "InuaBiz features — Kenya POS & M-Pesa till",
      ogDescription:
        "POS, M-Pesa sync, credit ledger, inventory, multi-shop and AI insights — built for Kenyan shopkeepers.",
      jsonLd: [
        softwareApplicationJsonLd(),
        breadcrumbJsonLd([
          { name: "InuaBiz", path: "/" },
          { name: "Features", path: "/features" },
        ]),
      ],
    }),
  component: Features,
});

function Features() {
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const shop = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;
  const priceLabel = KES(shop);

  const vendorFeatures = [
    {
      icon: Store,
      title: "Mobile POS & checkout",
      body: "A fast product grid with search, instant cart totals and discounts — built for a counter, not a desktop. Cash, credit or M-Pesa STK from the same cart.",
      points: ["Grid + search checkout", "Cash, credit or STK", "Install on the home screen"],
    },
    {
      icon: ScanBarcode,
      title: "Camera barcode scanning",
      body: "Use the phone camera as a scanner. No extra hardware, no extra cost.",
      points: ["Scan to add to cart", "Scan to receive stock", "Works on a regular smartphone"],
    },
    {
      icon: Smartphone,
      title: "M-Pesa that matches the sale",
      body: "STK push at checkout. Till and Paybill land on the same sale. If a PIN times out, we re-check automatically after a few minutes.",
      points: ["STK from the cart", "Till & Paybill", "Auto retry on stuck PIN"],
    },
    {
      icon: BookOpen,
      title: "Duka debt / credit ledger",
      body: "Digitise kukopesha. Record credit in two taps, see who is overdue, and email yourself a reminder when it is time to follow up.",
      points: ["Per-customer balances", "Due dates", "Email reminders"],
    },
    {
      icon: Package,
      title: "Inventory & stock alerts",
      body: "Live stock, reorder levels and a low-stock ping in the app and by email when a SKU crosses the line.",
      points: ["Reorder levels", "Margin per product", "Low-stock email"],
    },
    {
      icon: Users,
      title: "Customers, quietly",
      body: "Frequent buyers are recognised by phone number. No loyalty cards, no app for your customers to download.",
      points: ["Visit and spend history", "Credit on the same phone", "Quiet regulars"],
    },
    {
      icon: FileText,
      title: "Receipts & wholesale invoices",
      body: "Every paid sale can get a fiscal invoice number. Wholesale bills go to the buyer's M-Pesa Bill Manager menu, with an email copy and an overdue nudge.",
      points: ["Shop-copy email receipts", "Bill Manager invoices", "Overdue follow-up"],
    },
    {
      icon: Building2,
      title: "Extra shops",
      body: `First shop is in the ${trialDays}-day trial. Each extra location is ${priceLabel} on M-Pesa before it is created. Switch counters without mixing the books.`,
      points: ["Pay then create", `${priceLabel} per shop`, "Separate stock per shop"],
    },
    {
      icon: UserPlus,
      title: "Staff on the till",
      body: "Invite a cashier by phone. They sell on your shop; you keep owner settings, billing and the books.",
      points: ["Phone invite", "Optional email invite", "Owner-only shop settings"],
    },
    {
      icon: Wallet,
      title: "Subscription on M-Pesa",
      body: `After trial, renew with one PIN — ${priceLabel} per shop. Optional M-Pesa Ratiba standing order so the month renews without chasing a prompt.`,
      points: ["STK renewal", "Ratiba auto-debit", "Access pauses, data stays"],
    },
    {
      icon: Mail,
      title: "Emails that match the till",
      body: "Welcome, trial ending, paid or failed STK, daily till summary, low stock, credit reminders and contact-form replies — branded, from InuaBiz.",
      points: ["Daily till summary", "Trial & billing mail", "Optional sale receipts"],
    },
    {
      icon: Brain,
      title: "AI restock advice",
      body: "Cash-flow, bestsellers and reorder notes in plain language — written for the person at the counter, not a finance team.",
      points: ["7-day till read", "Reorder advice", "Margin tips"],
    },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-8 sm:px-6">
          <Badge variant="secondary">For shopkeepers</Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold sm:text-5xl">
            Every tool a small Kenyan shop needs, in one app
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
            InuaBiz replaces the ledger book, the mental stock count, the unmatched M-Pesa text and
            the guesswork about next month's cash. One price per shop covers all of it.
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
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-5 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-2xl font-bold">Ready for your counter?</h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                {trialDays}-day trial on Standard ({priceLabel} / shop). Compliance and custom
                licenses are on pricing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/signup">Start free trial</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
