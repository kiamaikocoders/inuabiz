import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Package, Smartphone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KES, TRIAL_DAYS } from "@/lib/mock-data";

export const Route = createFileRoute("/for-dukas")({
  head: () => ({
    meta: [
      { title: "InuaBiz for dukas — POS, credit book and M-Pesa in one app" },
      {
        name: "description",
        content:
          "Made for Kenyan duka owners: fast phone POS, digital kukopesha ledger, automatic M-Pesa matching, extra shops and stock alerts. 3-day free trial, KES 3,000 per shop / month.",
      },
      { property: "og:title", content: "InuaBiz for dukas" },
    ],
  }),
  component: ForDukas,
});

const pains = [
  {
    icon: BookOpen,
    pain: "The exercise book that went missing",
    fix: "Every credit sale is tied to a phone number. Balances update when they pay — no page to tear out.",
  },
  {
    icon: Smartphone,
    pain: "M-Pesa SMS you cannot match to a sale",
    fix: "STK push from the cart. Till and Paybill land on the same sale — you stop hunting SMS threads.",
  },
  {
    icon: Package,
    pain: "Sugar finished on Friday, again",
    fix: "Reorder alerts and AI that says which SKU runs out before the weekend rush.",
  },
];

function ForDukas() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="bg-hero-gradient relative overflow-hidden">
          <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div>
              <Badge className="bg-gold text-gold-foreground border-transparent">For duka owners</Badge>
              <h1 className="text-primary-foreground mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                The counter, without the notebook.
              </h1>
              <p className="text-primary-foreground/80 mt-5 max-w-lg text-lg leading-relaxed">
                InuaBiz is a micro-POS for dukas that still run on trust, till numbers and a busy
                Saturday. One thumb. {TRIAL_DAYS}-day trial. No registrar, no card.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/signup">
                    Open my duka on InuaBiz <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/how-it-works">How a day on the till works</Link>
                </Button>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border/60 p-6 shadow-lift">
              <p className="font-display text-sm font-semibold">Mama Njoroge · Kasarani</p>
              <p className="mt-4 text-3xl font-bold">{KES(18600)}</p>
              <p className="text-muted-foreground text-xs">Saturday till · 34 sales · 6 on credit</p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="bg-muted/60 rounded-lg px-3 py-2.5">Unga 2kg · M-Pesa STK · {KES(195)}</li>
                <li className="bg-muted/60 rounded-lg px-3 py-2.5">Oil 1L · Till · {KES(340)}</li>
                <li className="bg-muted/60 rounded-lg px-3 py-2.5">Mama Njeri credit · {KES(1250)} due</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold">What dukas actually lose money on</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pains.map((p) => (
              <div key={p.pain} className="surface-card p-6">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{p.pain}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{p.fix}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-3">
            <Store className="text-primary size-5" />
            <p className="text-sm text-muted-foreground">
              Also used by chemists, boutiques and eateries — Standard from KES 3,000 / shop, or a
              custom license.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
