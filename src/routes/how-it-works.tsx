import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How InuaBiz works — from sign-up to reconciled sale" },
      {
        name: "description",
        content:
          "From a 2-minute phone sign-up to an STK push at checkout and an automatically reconciled sale — see exactly how InuaBiz works day to day.",
      },
      { property: "og:title", content: "How InuaBiz works" },
      {
        property: "og:description",
        content: "Sign up in 2 minutes, sell, take M-Pesa and let reconciliation happen by itself.",
      },
    ],
  }),
  component: HowItWorks,
});

const journey = [
  {
    stage: "Day 0",
    title: "Sign up with your phone number",
    body: "Enter your 07xx or 01xx number and confirm the 4-digit SMS code. Add your business name, category and let the browser pin your store location. Choose where money should land — personal M-Pesa, Till or Paybill. Your 14-day trial starts immediately.",
  },
  {
    stage: "Day 0",
    title: "Load your products",
    body: "Add products by name or scan barcodes with the phone camera. Set cost price, selling price and a reorder level so InuaBiz can warn you before you run out.",
  },
  {
    stage: "Every day",
    title: "Sell at the counter",
    body: "Tap products into the cart, apply a discount if you want, then choose a payment method. For M-Pesa, enter the customer number and an STK prompt appears on their handset instantly.",
  },
  {
    stage: "Instantly",
    title: "Payment confirms itself",
    body: "When the customer enters their PIN, the confirmation is matched to the sale automatically. A chime plays on the POS, stock decrements and a digital receipt goes out by SMS or email.",
  },
  {
    stage: "When it fails",
    title: "Clear fallbacks, never a lost sale",
    body: "Wrong PIN, timeout or cancellation shows an immediate alert with a retry button and your alternative Paybill or Till instructions. Stuck payments are re-checked automatically after three minutes.",
  },
  {
    stage: "On credit",
    title: "Record kukopesha properly",
    body: "Give credit in two taps against a customer's phone number. Balances, due dates and reminder history are tracked, and WhatsApp reminders go out on your schedule.",
  },
  {
    stage: "Weekly",
    title: "Let the AI do the thinking",
    body: "Cash-flow forecasts, reorder recommendations, margin warnings and quiet-customer alerts arrive as plain-language insights you can act on in one tap.",
  },
  {
    stage: "Day 14",
    title: "Subscribe with one PIN",
    body: "An STK prompt for KES 3,000 arrives on your registered number. Approve it and access extends 30 days. Later, M-Pesa Ratiba can make renewals fully automatic.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 sm:px-6">
          <Badge variant="secondary">Step by step</Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold sm:text-5xl">
            From sign-up to a reconciled sale
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
            No training day, no consultant, no hardware. Here is the whole journey.
          </p>
        </section>

        <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
          <ol className="relative border-l border-border pl-8">
            {journey.map((s, i) => (
              <li key={s.title} className="pb-10 last:pb-0">
                <span className="bg-primary text-primary-foreground absolute -left-4 grid size-8 place-items-center rounded-full font-display text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-gold-foreground bg-gold/25 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {s.stage}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="surface-card flex flex-col items-start justify-between gap-5 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Ready to try it on your own counter?</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                14 days, full access, nothing to pay upfront.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to="/onboarding">
                Start free trial <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
