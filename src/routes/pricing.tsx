import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Check, Landmark, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
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
import { COMPLIANCE_PRICE, KES, SETUP_FEE, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Standard, Compliance & Enterprise | InuaBiz" },
      {
        name: "description",
        content:
          "InuaBiz Standard at KES 3,000/month, Compliance (ETR) at KES 4,500/month, optional KES 1,000 setup, and enterprise custom builds with dedicated infrastructure.",
      },
      { property: "og:title", content: "InuaBiz pricing — Standard, Compliance, Enterprise" },
      {
        property: "og:description",
        content:
          "Self-serve till from KES 3,000 per shop. ETR compliance pack, assisted setup and white-label enterprise licenses — talk to Nairobi.",
      },
    ],
  }),
  component: Pricing,
});

const standardIncludes = [
  "Unlimited POS (cash, credit, M-Pesa STK)",
  "Till and Paybill matched to the sale",
  "Duka debt ledger and stock alerts",
  "Fiscal shop invoices and optional email receipts",
  "Wholesale invoices into M-Pesa Bill Manager",
  "Staff invites and extra shops (self-serve)",
  "Daily till summary and AI restock notes",
  "Optional M-Pesa Ratiba auto-renewal",
];

const complianceIncludes = [
  "Everything in Standard",
  "Electronic tax records (ETR) on paid and credit sales",
  "KRA PIN on the shop profile",
  "Audit-ready INB invoice numbers",
  "Quoted upgrade — not a self-serve PIN today",
];

const enterpriseIncludes = [
  "Custom software builds and bespoke workflows",
  "Dedicated / isolated database per tenant",
  "White-label branding and category shop UI",
  "Upfront license rather than shared-tier SaaS",
  "SLA: hosting, maintenance and support",
];

const faqs = [
  {
    q: "What can I start on today, by myself?",
    a: `Standard. Sign up, take the ${TRIAL_DAYS}-day trial on the first shop, then pay ${KES(SUBSCRIPTION_PRICE)} per shop / month by M-Pesa PIN. Extra shops on self-serve are the same rate, paid before the shop is created.`,
  },
  {
    q: "How is Compliance (KES 4,500) different?",
    a: "It is Standard plus the ETR compliance pack for shops that need fuller tax records. Self-serve signup is still Standard (KES 3,000). We switch a shop to Compliance with you and bill KES 4,500 / month — there is no 4,500 PIN on signup today.",
  },
  {
    q: "Is there a setup fee?",
    a: `Self-serve trial is free. Assisted onboarding is ${KES(SETUP_FEE)}. We can also run a hybrid: you pay the setup fee, the trial starts, then the monthly STK takes over. Ask for that on the contact form.`,
  },
  {
    q: "How do extra shops and multi-location accounts work?",
    a: `Self-serve: each extra shop is ${KES(SUBSCRIPTION_PRICE)}, paid on M-Pesa before it goes live, billed together at renewal. Several locations, a single commercial account, or a custom rate — that is a quote, not the public calculator.`,
  },
  {
    q: "Do I need a registered business or Paybill?",
    a: "Not for Standard. Start with a personal M-Pesa number. The Compliance pack is for shops that already keep a KRA PIN and want ETR records handled with us.",
  },
  {
    q: "What happens if a Standard payment fails?",
    a: "We retry and show a retry button plus your Till or Paybill as backup. Data is never deleted — only writing new sales pauses until you renew.",
  },
  {
    q: "Can I cancel Standard anytime?",
    a: "Yes. You keep access until the end of the paid period. Enterprise licenses follow the contract and SLA you sign.",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6">
          <Badge variant="secondary">SaaS, compliance and custom builds</Badge>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Pricing that matches how you run</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl leading-relaxed">
            Self-serve Standard for the counter. A Compliance (ETR) pack when you need it. Custom
            terms for many shops — and a standalone enterprise license when you need your own stack.
          </p>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-3">
          <PlanCard
            eyebrow="Standard"
            price={KES(SUBSCRIPTION_PRICE)}
            cadence="per shop / month"
            blurb={`Base POS and operations. ${TRIAL_DAYS}-day trial on shop one, then M-Pesa PIN. No cut on your sales.`}
            items={standardIncludes}
            cta="Start free trial"
            to="/signup"
            featured
          />
          <PlanCard
            eyebrow="Compliance"
            price={KES(COMPLIANCE_PRICE)}
            cadence="per shop / month"
            blurb="ETR compliance pack for shops that need fuller tax records. We onboard this with you — not a self-serve PIN today."
            items={complianceIncludes}
            cta="Talk about compliance"
            to="/contact"
            icon={ShieldCheck}
          />
          <PlanCard
            eyebrow="Enterprise"
            price="Custom"
            cadence="license + SLA"
            blurb="Bespoke workflows, isolated databases, white-label and an upfront build — not the shared SaaS meter."
            items={enterpriseIncludes}
            cta="Request a quote"
            to="/contact"
            icon={Landmark}
          />
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2">
          <div className="surface-card p-7">
            <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
              <Smartphone className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Setup &amp; onboarding</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Self-serve signup has no setup fee. If you want us at the counter with you, assisted
              onboarding is {KES(SETUP_FEE)}.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Hybrid trial: pay the setup fee, the trial unlocks, then the monthly subscription
              STK takes over. Say so on the contact form and we will run that flow for you.
            </p>
          </div>
          <div className="surface-card p-7">
            <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
              <Building2 className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Multi-shop</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              A few extra locations on one login: each extra shop is {KES(SUBSCRIPTION_PRICE)} on
              M-Pesa before it is created. Renewal is shop count × the plan rate.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Chains, franchises or one commercial invoice for many tills: custom pricing — not the
              public per-shop calculator. We quote that as Enterprise or a multi-shop schedule.
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="bg-gold/20 text-gold-foreground grid size-11 shrink-0 place-items-center rounded-xl">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-primary text-sm font-semibold tracking-widest uppercase">
                  Enterprise &amp; standalone licenses
                </p>
                <h2 className="mt-2 text-3xl font-bold">Built for one client, not the shared till</h2>
                <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                  Larger operators who need dedicated setups pay an upfront custom software build
                  and licensing fee rather than Standard or Compliance SaaS. That license includes
                  deployment to isolated infrastructure and a maintenance contract.
                </p>
              </div>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                {
                  t: "Upfront build / license",
                  d: "Bespoke features and workflows scoped to your operation. Quoted once, not metered like the public 3,000 / 4,500 plans.",
                },
                {
                  t: "Dedicated infrastructure",
                  d: "Separate database instance and hosting so your data, performance and backups stay isolated from the shared SaaS tenants.",
                },
                {
                  t: "White-label & branding",
                  d: "Your mark, colours and category shop configuration — not the InuaBiz marketing skin — on the till your cashiers open.",
                },
                {
                  t: "Ongoing SLA",
                  d: "Cloud hosting, system maintenance and support as a recurring contract beside the license, with agreed response times.",
                },
              ].map((x) => (
                <li key={x.t} className="rounded-xl border border-border bg-background p-5">
                  <h3 className="font-semibold">{x.t}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{x.d}</p>
                </li>
              ))}
            </ul>
            <Button className="mt-8" asChild>
              <Link to="/contact">Talk to Nairobi about a license</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
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
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({
  eyebrow,
  price,
  cadence,
  blurb,
  items,
  cta,
  to,
  featured,
  icon: Icon,
}: {
  eyebrow: string;
  price: string;
  cadence: string;
  blurb: string;
  items: string[];
  cta: string;
  to: "/signup" | "/contact";
  featured?: boolean;
  icon?: typeof ShieldCheck;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-7",
        featured
          ? "bg-hero-gradient relative overflow-hidden shadow-lift"
          : "surface-card",
      )}
    >
      {featured ? <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden /> : null}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon className={cn("size-4", featured ? "text-gold" : "text-primary")} />
          ) : null}
          <p
            className={cn(
              "text-sm font-semibold tracking-widest uppercase",
              featured ? "text-gold" : "text-primary",
            )}
          >
            {eyebrow}
          </p>
        </div>
        <p
          className={cn(
            "mt-4 font-display text-4xl font-bold",
            featured ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {price}
        </p>
        <p className={cn("mt-1 text-sm", featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {cadence}
        </p>
        <p
          className={cn(
            "mt-4 text-sm leading-relaxed",
            featured ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {blurb}
        </p>
        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <Check
                className={cn("mt-0.5 size-4 shrink-0", featured ? "text-gold" : "text-success")}
              />
              <span className={featured ? "text-primary-foreground/80" : "text-muted-foreground"}>
                {item}
              </span>
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          className="mt-7 w-full"
          variant={featured ? "secondary" : "outline"}
          asChild
        >
          <Link to={to}>{cta}</Link>
        </Button>
      </div>
    </div>
  );
}
