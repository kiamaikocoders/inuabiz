import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, HeartHandshake, Smartphone, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { COMPLIANCE_PRICE, KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";

export const Route = createFileRoute("/karibu")({
  head: () => ({
    meta: [
      { title: "Karibu InuaBiz — Lift your duka from your phone" },
      {
        name: "description",
        content:
          "Karibu. InuaBiz is the Kenyan micro-POS for dukas, chemists and boutiques. Email signup, M-Pesa reconciliation, credit ledger and AI restock advice. 3-day free trial.",
      },
      { property: "og:title", content: "Karibu — InuaBiz" },
    ],
  }),
  component: Karibu,
});

function Karibu() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="bg-hero-gradient relative overflow-hidden">
          <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:py-32">
            <Badge className="bg-gold text-gold-foreground border-transparent">Karibu sana</Badge>
            <h1 className="text-primary-foreground mt-6 text-4xl font-bold leading-tight sm:text-6xl">
              Karibu InuaBiz.
              <span className="text-gold block">Inua biashara yako.</span>
            </h1>
            <p className="text-primary-foreground/80 mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              Welcome. This is the till, the credit book and the M-Pesa messages — in one phone app
              built for Kenyan shopkeepers. No paperwork. {TRIAL_DAYS} days free.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/signup">
                  Anza trial <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/for-dukas">For duka owners</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-20 sm:px-6 md:grid-cols-3">
          {[
            {
              icon: Smartphone,
              title: "Account, then the shop",
              body: "Sign up with email, verify the OTP, then finish shop setup before you can sell.",
            },
            {
              icon: Wallet,
              title: "M-Pesa inajireconcile",
              body: "STK, Till or Paybill — payments match the sale so you stop hunting SMS threads.",
            },
            {
              icon: HeartHandshake,
              title: "Kukopesha, digitally",
              body: "Who owes what, when it is due, and an email nudge before the friendship sours.",
            },
          ].map((c) => (
            <div key={c.title} className="surface-card p-6">
              <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                <c.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium">
                <Store className="text-primary size-4" /> Built in Nairobi, for the counter
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                From {KES(SUBSCRIPTION_PRICE)} / shop after trial
              </h2>
              <p className="text-muted-foreground mt-2 max-w-lg text-sm">
                Standard POS on M-Pesa PIN. Compliance (ETR) at {KES(COMPLIANCE_PRICE)}. Custom
                builds for dedicated infrastructure.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  <BadgeCheck className="mr-2 size-4" /> Start free trial
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">See all plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
