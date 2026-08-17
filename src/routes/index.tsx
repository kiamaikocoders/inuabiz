import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CreditCard,
  Map,
  Package,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InuaBiz — Lift Your Business | Micro-POS for Kenyan vendors" },
      {
        name: "description",
        content:
          "Mobile-first POS, M-Pesa auto-reconciliation, digital credit ledger and AI cash-flow insights for Kenyan dukas, chemists and boutiques. KES 3,000/month.",
      },
      { property: "og:title", content: "InuaBiz — Lift Your Business" },
      {
        property: "og:description",
        content:
          "Sell, track credit and reconcile M-Pesa from your phone. 14-day free trial, no paperwork.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Store,
    title: "Mobile POS & checkout",
    body: "Fast grid search, camera barcode scanning, instant cart totals and discount toggles — built for one thumb.",
  },
  {
    icon: Smartphone,
    title: "M-Pesa multi-channel sync",
    body: "Paybill, Till, Pochi la Biashara or a personal number — payments reconcile themselves against every sale.",
  },
  {
    icon: BookOpen,
    title: "Duka debt ledger",
    body: "Digitise kukopesha. Track who owes what and send automated WhatsApp reminders without the awkward talk.",
  },
  {
    icon: Package,
    title: "Inventory & stock alerts",
    body: "Live stock levels, low-stock push alerts and true margin tracking on cost versus selling price.",
  },
  {
    icon: Sparkles,
    title: "AI financial intelligence",
    body: "Cash-flow forecasts, best-seller predictions and reorder recommendations written in plain language.",
  },
  {
    icon: Map,
    title: "Loyalty, quietly",
    body: "Frequent buyers are recognised by phone number alone — no cards, no app downloads for your customers.",
  },
];

const steps = [
  { time: "30s", title: "Phone-first login", body: "Enter your 07xx number, tap the SMS code. No email, no password." },
  { time: "45s", title: "Business & GPS pin", body: "Name, category and one-tap location detection for your store." },
  { time: "30s", title: "Payment destination", body: "Add your M-Pesa number, Till or Paybill. Trial starts instantly." },
  { time: "15s", title: "First test sale", body: "Land on the POS with a sample product and check out immediately." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="bg-hero-gradient relative overflow-hidden">
          <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div>
              <Badge className="bg-gold text-gold-foreground border-transparent hover:bg-gold">
                {TRIAL_DAYS}-day free trial · no paperwork
              </Badge>
              <h1 className="text-primary-foreground mt-6 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
                Lift your business
                <span className="text-gold block">from your phone.</span>
              </h1>
              <p className="text-primary-foreground/80 mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
                InuaBiz is the micro-POS built for Kenyan dukas, boutiques, chemists and eateries.
                Sell fast, reconcile M-Pesa automatically, track customer credit and let AI tell you
                what to restock next.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/onboarding">
                    Start free trial <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/app">See the vendor app</Link>
                </Button>
              </div>
              <div className="text-primary-foreground/70 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="text-gold size-4" /> No business registration needed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="text-gold size-4" /> Works on any smartphone
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card mx-auto w-full max-w-sm rounded-3xl border border-border/60 p-5 shadow-lift">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-semibold">Today · Njoroge Mini Mart</p>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <p className="mt-4 font-display text-3xl font-bold">{KES(18600)}</p>
                <p className="text-muted-foreground text-xs">34 sales · 6 on credit</p>

                <div className="mt-5 space-y-2.5">
                  {[
                    { n: "Unga Pembe 2kg", a: 195, c: "M-Pesa STK" },
                    { n: "Cooking Oil 1L", a: 340, c: "Till" },
                    { n: "Fresh Milk 500ml", a: 70, c: "Cash" },
                  ].map((r) => (
                    <div
                      key={r.n}
                      className="bg-muted/60 flex items-center justify-between rounded-lg px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{r.n}</p>
                        <p className="text-muted-foreground text-[11px]">{r.c}</p>
                      </div>
                      <p className="text-sm font-semibold">{KES(r.a)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-primary-soft mt-5 rounded-xl p-3.5">
                  <p className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Sparkles className="size-3.5" /> AI insight
                  </p>
                  <p className="text-primary/90 mt-1 text-xs leading-relaxed">
                    Sugar runs out Thursday at the current pace. Order 2 cartons before Friday's
                    rush.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="bg-card border-y border-border">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
            {[
              { k: "< 2 min", v: "Full onboarding" },
              { k: "4 channels", v: "M-Pesa coverage" },
              { k: "KES 3,000", v: "Flat monthly price" },
              { k: "14 days", v: "Free, full access" },
            ].map((s) => (
              <div key={s.k}>
                <p className="font-display text-2xl font-bold">{s.k}</p>
                <p className="text-muted-foreground mt-1 text-sm">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase">
              Everything in one app
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Built around how a Kenyan shop actually runs
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Not a shrunken enterprise POS. Every screen was designed for a busy counter, a small
              phone and an intermittent network.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="surface-card p-6 transition-shadow hover:shadow-lift">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Onboarding */}
        <section className="bg-card border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Onboarded in under two minutes</h2>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Business registration certificates can wait. Start recording sales today.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {steps.map((s, i) => (
                <div key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full font-display text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gold-foreground bg-gold/25 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {s.time}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Personas */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Made for these owners</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                who: "Mama Njoroge",
                what: "Retail duka owner",
                pain: "Manual ledger books, lost credit records, unverified M-Pesa texts.",
                fix: "2-tap credit recording and instant M-Pesa reconciliation.",
              },
              {
                who: "Boutique & chemist",
                what: "Specialty retail",
                pain: "Stock leakage, unknown margins, unpredictable reorder cycles.",
                fix: "Stock alerts, demand forecasting and reorder triggers.",
              },
              {
                who: "Platform operator",
                what: "Super admin",
                pain: "Managing vendors manually with no operational visibility.",
                fix: "GIS store map, unclaimed payment queue and one-click impersonation.",
              },
            ].map((p) => (
              <div key={p.who} className="surface-card p-6">
                <p className="font-display text-lg font-semibold">{p.who}</p>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">{p.what}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.pain}</p>
                <p className="text-primary mt-3 text-sm font-medium leading-relaxed">{p.fix}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="bg-hero-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-lift sm:px-12">
            <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
            <div className="relative">
              <Wallet className="text-gold mx-auto size-8" />
              <h2 className="text-primary-foreground mt-4 text-3xl font-bold sm:text-4xl">
                One flat price. Everything included.
              </h2>
              <p className="text-primary-foreground/80 mt-3">
                {KES(SUBSCRIPTION_PRICE)} per month after your {TRIAL_DAYS}-day trial. Paid by
                M-Pesa STK push — no card required.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/onboarding">Start free trial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/pricing">
                    <CreditCard className="mr-1 size-4" /> See what's included
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
