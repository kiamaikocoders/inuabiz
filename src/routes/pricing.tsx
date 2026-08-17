import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — KES 3,000/month flat | InuaBiz" },
      {
        name: "description",
        content:
          "One flat InuaBiz subscription at KES 3,000 per month. 14-day free trial, M-Pesa STK billing, no card and no business registration required.",
      },
      { property: "og:title", content: "InuaBiz pricing — KES 3,000/month flat" },
      {
        property: "og:description",
        content: "All-inclusive micro-POS, M-Pesa reconciliation and AI insights. Trial free for 14 days.",
      },
    ],
  }),
  component: Pricing,
});

const included = [
  "Unlimited mobile POS checkouts",
  "M-Pesa Paybill, Till, Pochi & personal number sync",
  "Automatic payment reconciliation",
  "Duka debt / credit ledger with WhatsApp reminders",
  "Inventory tracking and low-stock alerts",
  "Discrete customer loyalty tracking",
  "AI cash-flow forecasting & reorder advice",
  "Digital invoices and receipts",
  "Multi-device access for your staff",
  "In-app, email and SMS notifications",
];

const faqs = [
  {
    q: "Do I need a registered business or Paybill?",
    a: "No. You can start with a personal M-Pesa number. Add a Till or Paybill later whenever you get one — InuaBiz supports all of them.",
  },
  {
    q: "How is the subscription paid?",
    a: "On day 14 of your trial (and every renewal) you receive an M-Pesa STK prompt on your registered number for KES 3,000. Approve with your PIN and access extends 30 days.",
  },
  {
    q: "What happens if a payment fails?",
    a: "We retry automatically and show you a retry button plus alternative Paybill instructions. Your data is never deleted — only write access pauses until you renew.",
  },
  {
    q: "Are there tiers or hidden fees?",
    a: "No. One flat rate, everything included. Tiers may be introduced later, but existing vendors keep the plan they signed up on.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from Settings and you keep access until the end of the paid period. Export your sales and customers at any time.",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6">
          <Badge variant="secondary">Simple by design</Badge>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">One plan. One price.</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed">
            No tiers to decode, no per-transaction cuts on your sales. Every InuaBiz feature is
            included from day one.
          </p>
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="bg-hero-gradient relative overflow-hidden rounded-2xl p-8 shadow-lift">
            <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
            <div className="relative">
              <p className="text-gold text-sm font-semibold tracking-widest uppercase">
                InuaBiz Complete
              </p>
              <p className="text-primary-foreground mt-4 font-display text-5xl font-bold">
                {KES(SUBSCRIPTION_PRICE)}
              </p>
              <p className="text-primary-foreground/70 mt-1 text-sm">per month, per business</p>
              <div className="border-primary-foreground/15 mt-6 border-t pt-6">
                <p className="text-primary-foreground/85 text-sm leading-relaxed">
                  Starts with a {TRIAL_DAYS}-day full-access trial. No card, no upfront Paybill, no
                  commitment.
                </p>
              </div>
              <Button size="lg" variant="secondary" className="mt-7 w-full" asChild>
                <Link to="/onboarding">Start free trial</Link>
              </Button>
              <p className="text-primary-foreground/60 mt-3 inline-flex items-center gap-1.5 text-xs">
                <Smartphone className="size-3.5" /> Billed by M-Pesa STK push via IntaSend
              </p>
            </div>
          </div>

          <div className="surface-card p-8">
            <h2 className="text-lg font-semibold">Everything included</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <Check className="text-success mt-0.5 size-4 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-muted mt-7 rounded-xl p-4">
              <p className="text-sm font-medium">Coming in later phases</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                M-Pesa Ratiba standing orders for hands-free renewal, and M-Pesa Bill Manager
                e-invoicing that pushes bills straight into your buyer's M-Pesa menu.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-card border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Frequently asked</h2>
            <Accordion type="single" collapsible className="mt-6">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
