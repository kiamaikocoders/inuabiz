import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  COMPLIANCE_PRICE,
  KES,
  SETUP_FEE,
  SUBSCRIPTION_PRICE,
  TRIAL_DAYS,
} from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { breadcrumbJsonLd, faqJsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "InuaBiz pricing — Kenya POS plans from Ksh 3,000 / shop",
      description:
        "InuaBiz Standard per shop / month after a free trial, Compliance (ETR) when you need the tax pack, assisted setup, and enterprise custom builds. Clear Kenya POS pricing.",
      path: "/pricing",
      ogTitle: "InuaBiz pricing — Standard, Compliance, Enterprise",
      ogDescription:
        "Self-serve till from admin-managed plan rates. ETR compliance, assisted setup and white-label enterprise — Nairobi team.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "InuaBiz", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]),
        faqJsonLd([
          {
            question: "How much does InuaBiz cost?",
            answer:
              "Standard is priced per shop / month after a short free trial on the first shop. Compliance (ETR) and enterprise licenses are available when you need them.",
          },
          {
            question: "Is there an InuaBiz free trial?",
            answer:
              "Yes. New shops get a free trial on the first location before Standard billing starts.",
          },
        ]),
      ],
    }),
  component: Pricing,
});

const standardIncludes = [
  "Unlimited POS — cash, credit, STK",
  "Till and Paybill matched to the sale",
  "Kukopesha ledger and stock alerts",
  "Fiscal invoices and email receipts",
  "Extra shops self-serve",
  "Daily till summary at 6am EAT",
];

const complianceIncludes = [
  "Everything in Standard",
  "ETR on paid and credit sales",
  "KRA PIN on the shop profile",
  "Audit-ready INB invoice numbers",
  "Quoted — not a self-serve PIN",
];

const enterpriseIncludes = [
  "Custom software builds",
  "Dedicated / isolated database",
  "White-label branding",
  "Upfront license, not a PIN",
  "Hosting, maintenance and support",
];

const licensePoints = [
  {
    t: "Upfront build / license",
    d: "Bespoke features and workflows scoped to your operation. Quoted once, not metered like the public Standard / Compliance plans.",
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
];

function Pricing() {
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const shop = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const compliance = pricing?.compliance ?? COMPLIANCE_PRICE;
  const setup = pricing?.setup ?? SETUP_FEE;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;

  const faqs = useMemo(
    () => [
      {
        q: "What can I start on today, by myself?",
        a: `Standard. Sign up, take the ${trialDays}-day trial on the first shop, then pay ${KES(shop)} per shop / month by M-Pesa PIN. Extra shops on self-serve are the same rate, paid before the shop is created.`,
      },
      {
        q: `How is Compliance (${KES(compliance)}) different?`,
        a: `It is Standard plus the ETR compliance pack for shops that need fuller tax records. You can pick Compliance on the last onboarding step, or stay on Standard (${KES(shop)}) and upgrade later from Billing.`,
      },
      {
        q: "Is there a setup fee?",
        a: `Self-serve trial is free. Assisted onboarding is ${KES(setup)}. We can also run a hybrid: you pay the setup fee, the trial starts, then the monthly STK takes over. Ask for that on the contact form.`,
      },
      {
        q: "How do extra shops and multi-location accounts work?",
        a: `Self-serve: each extra shop is ${KES(shop)}, paid on M-Pesa before it goes live, billed together at renewal. Several locations, a single commercial account, or a custom rate — that is a quote, not the public calculator.`,
      },
      {
        q: "Do I need a registered business or Paybill?",
        a: "Not for Standard. Start with a personal M-Pesa number. The Compliance pack is for shops that already keep a KRA PIN and want ETR records handled with us.",
      },
      {
        q: "Can I cancel Standard anytime?",
        a: "Yes. You keep access until the end of the paid period. Enterprise licenses follow the contract and SLA you sign.",
      },
    ],
    [shop, compliance, setup, trialDays],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-20">
          <img
            src="/images/pricing/hero-hardware.jpg"
            alt="Hardware dukawalla at a wooden counter in late morning Nairobi light"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[#085540]/72" aria-hidden />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center text-center">
            <p className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white">
              {trialDays}-DAY FREE TRIAL
            </p>
            <h1 className="text-primary-foreground mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Choose the till that matches how you run
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
              Self-serve Standard from {KES(shop)} a shop. Compliance when you need ETR. Custom terms
              when you outgrow the public meter.
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white">
              {["Create account & start trial", "Cancel anytime", "No cut on your sales"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="bg-gold grid size-[18px] place-items-center rounded-full">
                    <Check className="size-3 text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mx-auto mt-10 grid max-w-6xl items-stretch gap-5 lg:grid-cols-3">
            <PlanCard
              className="order-2 lg:order-1"
              badge="Quoted"
              name="Compliance"
              price={KES(compliance)}
              cadence="per shop / month · we switch you"
              blurb="Standard plus the ETR pack for shops that already keep a KRA PIN."
              items={complianceIncludes}
              cta="Talk about compliance"
              to="/contact"
            />
            <PlanCard
              className="order-1 lg:order-2"
              featured
              badge="Most popular"
              name="Standard"
              price={KES(shop)}
              cadence="per shop / month · M-Pesa PIN"
              blurb={`The till you start on. ${trialDays}-day trial on shop one, then one PIN. No cut on sales.`}
              items={standardIncludes}
              cta="Start free trial"
              to="/signup"
            />
            <PlanCard
              className="order-3"
              badge="Custom"
              badgeGold
              name="Enterprise"
              price="Quote"
              cadence="license + SLA"
              blurb="Bespoke workflows, isolated database and white-label — not the shared SaaS meter."
              items={enterpriseIncludes}
              cta="Request a quote"
              to="/contact"
              goldCta
            />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div className="rounded-[24px] bg-card p-7 shadow-lift">
            <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
              <Smartphone className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Setup &amp; onboarding</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Self-serve signup has no setup fee. If you want us at the counter with you, assisted
              onboarding is {KES(setup)}.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Hybrid trial: pay the setup fee, the trial unlocks, then the monthly subscription STK
              takes over. Say so on the contact form and we will run that flow for you.
            </p>
          </div>
          <div className="rounded-[24px] bg-card p-7 shadow-lift">
            <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
              <Building2 className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Multi-shop</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              A few extra locations on one login: each extra shop is {KES(shop)} on
              M-Pesa before it is created. Renewal is shop count × the plan rate.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Chains, franchises or one commercial invoice for many tills: custom pricing — not the
              public per-shop calculator. We quote that as Enterprise or a multi-shop schedule.
            </p>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-primary p-8 shadow-lift sm:p-10">
            <div className="flex items-start gap-3">
              <span className="bg-gold text-gold-foreground grid size-9 shrink-0 place-items-center rounded-[10px]">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-gold text-xs font-semibold tracking-[0.18em]">
                  ENTERPRISE &amp; STANDALONE LICENSES
                </p>
                <h2 className="text-primary-foreground mt-2 text-3xl font-bold">
                  Built for one client, not the shared till
                </h2>
                <p className="text-primary-foreground/80 mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
                  Larger operators who need dedicated setups pay an upfront custom software build
                  and licensing fee rather than Standard or Compliance SaaS. That license includes
                  deployment to isolated infrastructure and a maintenance contract.
                </p>
              </div>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {licensePoints.map((x) => (
                <li key={x.t} className="rounded-[18px] bg-card p-5 shadow-soft">
                  <h3 className="font-display font-bold">{x.t}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{x.d}</p>
                </li>
              ))}
            </ul>
            <Button size="lg" variant="gold" className="mt-8" asChild>
              <Link to="/contact">Talk to InuaBiz about a license</Link>
            </Button>
          </div>
        </section>

        <section id="faq" className="px-4 py-16 sm:px-6 lg:px-20">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[400px_1fr] lg:gap-16">
            <div>
              <p className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.18em]">
                <span className="bg-gold size-1.5 rounded-full" aria-hidden />
                FAQs
              </p>
              <h2 className="mt-3 text-3xl font-bold">Frequently asked questions</h2>
              <div className="mt-8 flex flex-col items-center rounded-[24px] bg-card px-7 py-8 text-center shadow-lift">
                <img
                  src="/images/pricing/faq-nairobi-woman.jpg"
                  alt="InuaBiz support team member"
                  className="size-[72px] rounded-full object-cover"
                />
                <h3 className="mt-4 text-xl font-bold">Talk to InuaBiz</h3>
                <p className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed">
                  If the public plans do not fit — extra shops, ETR, or a license — book 15 minutes
                  before you subscribe.
                </p>
                <Button variant="gold" className="mt-5 rounded-full" asChild>
                  <Link to="/contact">Talk to InuaBiz</Link>
                </Button>
              </div>
            </div>
            <Accordion type="single" collapsible defaultValue={faqs[0]!.q} className="space-y-3">
              {faqs.map((f) => (
                <AccordionItem
                  key={f.q}
                  value={f.q}
                  className="overflow-hidden rounded-[18px] border border-border bg-card px-5 shadow-soft data-[state=open]:shadow-lift"
                >
                  <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
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

function PlanCard({
  badge,
  badgeGold,
  name,
  price,
  cadence,
  blurb,
  items,
  cta,
  to,
  featured,
  goldCta,
  className,
}: {
  badge: string;
  badgeGold?: boolean;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  items: string[];
  cta: string;
  to: "/signup" | "/contact";
  featured?: boolean;
  goldCta?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-[24px] p-7",
        featured ? "bg-primary text-primary-foreground shadow-lift" : "bg-card shadow-lift",
        className,
      )}
    >
      <p
        className={cn(
          "w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase",
          featured || badgeGold
            ? "bg-gold text-gold-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {badge}
      </p>
      <h2 className="mt-4 text-2xl font-bold">{name}</h2>
      <p className="font-display mt-3 text-4xl font-bold">{price}</p>
      <p className={cn("mt-1 text-sm", featured ? "text-primary-foreground/75" : "text-muted-foreground")}>
        {cadence}
      </p>
      <p className={cn("mt-4 text-sm leading-relaxed", featured ? "text-primary-foreground/85" : "text-muted-foreground")}>
        {blurb}
      </p>
      <ul className="mt-6 flex flex-1 flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm">
            <span
              className={cn(
                "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full",
                featured ? "bg-gold" : "bg-primary",
              )}
            >
              <Check className="size-3 text-white" />
            </span>
            <span className={featured ? "text-primary-foreground/90" : "text-foreground/80"}>{item}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        className="mt-7 w-full rounded-xl"
        variant={featured ? "secondary" : goldCta ? "gold" : "default"}
        asChild
      >
        <Link to={to}>{cta}</Link>
      </Button>
    </article>
  );
}
