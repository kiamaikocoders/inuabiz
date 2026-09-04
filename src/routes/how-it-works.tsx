import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  HowItWorksCarousel,
  type JourneySlide,
} from "@/components/site/HowItWorksCarousel";
import { cn } from "@/lib/utils";
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import { breadcrumbJsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How InuaBiz works — sign up to M-Pesa reconciled sale",
      description:
        "See how InuaBiz works day to day: email sign-up, shop onboarding, M-Pesa matched at checkout, credit on the ledger, extra shops and a daily till email for Kenyan vendors.",
      path: "/how-it-works",
      ogTitle: "How InuaBiz works",
      ogDescription:
        "Sign up in about two minutes, sell, take M-Pesa and let reconciliation land on the sale.",
      jsonLd: breadcrumbJsonLd([
        { name: "InuaBiz", path: "/" },
        { name: "How it works", path: "/how-it-works" },
      ]),
    }),
  component: HowItWorks,
});

function buildSteps(trialDays: number) {
  return [
    {
      n: "1",
      stage: "Day 0",
      title: "Quick setup",
      sub: "Start in minutes",
      body: `Sign up with your name, shop, email and password. Verify the email OTP, then finish shop setup: category, GPS pin and where money should land. Your ${trialDays}-day trial starts when onboarding completes.`,
      image: "/images/how-it-works/step-salon.jpg",
      imageAlt: "Salon attendant filling shop details on a phone at the reception desk",
      photoLeft: false,
    },
    {
      n: "2",
      stage: "Day 0",
      title: "Load your products",
      sub: "Scan, price, reorder",
      body: "Add products by name or scan barcodes with the phone camera. Set cost price, selling price and a reorder level so InuaBiz can warn you — in the app and by email — before you run out.",
      image: "/images/how-it-works/step-maize-scan.jpg",
      imageAlt: "Hands scanning a maize flour barcode with a phone camera in a grocery",
      photoLeft: true,
    },
    {
      n: "3",
      stage: "Every day",
      title: "Sell at the counter",
      sub: "Fast checkout, cash or M-Pesa",
      body: "Tap products into the cart, apply a discount if you want, then choose cash, credit or M-Pesa. For M-Pesa, customers pay your shop's own till, paybill or phone — then confirm via companion SMS, a manual receipt code, or C2B match.",
      image: "/images/how-it-works/step-eatery.jpg",
      imageAlt: "Nyama choma attendant taking an order on a phone at lunch rush",
      photoLeft: false,
    },
    {
      n: "4",
      stage: "Instantly",
      title: "Payment confirms itself",
      sub: "Matched to the sale",
      body: "When payment lands — companion SMS, a typed M-Pesa code, or a C2B callback — it matches to the open sale. Stock decrements and a receipt number is issued. Turn on Settings → Send email receipt if you want a shop copy.",
      image: "/images/how-it-works/step-butcher.jpg",
      imageAlt: "Customer at a butcher counter looking at a phone while waiting for a parcel",
      photoLeft: true,
    },
  ];
}

function buildLoopSlides(shopPrice: number, trialDays: number): JourneySlide[] {
  return [
    {
      n: "05",
      stage: "WHEN IT FAILS",
      title: "Clear fallbacks, never a lost sale",
      body: "If a code is mistyped or SMS is delayed, retry the match or fall back to your Till or Paybill. Unmatched payments stay visible until you map them.",
      image: "/images/how-it-works/card-fallback.jpg",
      imageAlt: "Vendor showing a failed payment on a phone next to a handwritten till number",
      href: "/features",
    },
    {
      n: "06",
      stage: "ON CREDIT",
      title: "Record kukopesha properly",
      body: "Give credit in two taps against a customer's phone. Balances and due dates live on the ledger. Email yourself when someone is overdue.",
      image: "/images/how-it-works/card-kukopesha.jpg",
      imageAlt: "Open kukopesha debt ledger with names, dates and shilling amounts",
      href: "/features",
    },
    {
      n: "07",
      stage: "WHOLESALE",
      title: "Invoice the buyer on M-Pesa",
      body: "Create a bill with name, phone and optional email. It can land in Bill Manager. Unpaid past due date gets an overdue note.",
      image: "/images/how-it-works/card-invoice.jpg",
      imageAlt: "Wholesale counter handing a printed invoice to a buyer",
      imageClassName: "object-[center_62%]",
      href: "/features",
    },
    {
      n: "08",
      stage: "NEXT MORNING",
      title: "Yesterday's till, in your inbox",
      body: "A daily summary of sales and M-Pesa lands at 6am EAT. Low stock and trial-ending notes arrive when they matter.",
      image: "/images/how-it-works/card-morning.jpg",
      imageAlt: "Shopkeeper reading yesterday's till summary on a phone with morning chai",
      href: "/features",
    },
    {
      n: "09",
      stage: `DAY ${trialDays}`,
      title: "Subscribe with one PIN",
      body: `An STK prompt for ${KES(shopPrice)} per shop arrives on your number. Approve it and access extends 30 days.`,
      image: "/images/how-it-works/card-pin.jpg",
      imageAlt: "Hands entering a PIN on a phone to renew a shop subscription",
      imageClassName: "object-[center_78%]",
      href: "/pricing",
    },
  ];
}

function HowItWorks() {
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const shopPrice = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;
  const steps = buildSteps(trialDays);
  const loopSlides = buildLoopSlides(shopPrice, trialDays);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative h-[520px] overflow-hidden sm:h-[620px]">
          <img
            src="/images/how-it-works/hero-juice-kiosk.jpg"
            alt="Juice kiosk attendant tapping a phone at the till in the morning"
            className="absolute inset-0 size-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8, 85, 64, 0.18) 0%, rgba(8, 85, 64, 0.32) 42%, rgba(8, 85, 64, 0.72) 100%)",
            }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-4 pb-14 sm:px-6 lg:max-w-none lg:px-20">
            <p className="text-gold text-xs font-semibold tracking-[0.18em]">STEP BY STEP</p>
            <h1 className="text-primary-foreground mt-3 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              From sign-up to a reconciled sale
            </h1>
            <p className="text-primary-foreground/85 mt-4 max-w-lg text-base leading-relaxed">
              No training day, no consultant, no hardware. Here is the whole journey — from email
              OTP to yesterday's till in your inbox.
            </p>
            <Button size="lg" className="mt-6 w-fit" asChild>
              <Link to="/signup">
                Start free trial <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {steps.map((step, i) => (
          <section
            key={step.n}
            className={cn("px-4 py-16 sm:px-6 lg:px-20", i % 2 === 1 && "bg-card/60")}
          >
            <div
              className={cn(
                "mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16",
                step.photoLeft && "lg:[&>div:first-child]:order-2",
              )}
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="bg-gold text-gold-foreground grid size-10 place-items-center rounded-full font-display text-sm font-bold">
                    {step.n}
                  </span>
                  <p className="text-gold-foreground bg-gold/25 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    {step.stage}
                  </p>
                </div>
                <h2 className="mt-4 text-3xl font-bold">{step.title}</h2>
                <p className="text-primary mt-2 font-semibold">{step.sub}</p>
                <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={step.image}
                  alt={step.imageAlt}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </section>
        ))}

        <section className="py-16">
          <HowItWorksCarousel slides={loopSlides} />
        </section>

        <section className="bg-primary">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-primary-foreground text-2xl font-bold sm:text-3xl">
                Ready to try it on your own counter?
              </h2>
              <p className="text-primary-foreground/80 mt-2 text-sm">
                {trialDays} days, full access, nothing to pay upfront.
              </p>
            </div>
            <Button size="lg" variant="gold" asChild>
              <Link to="/signup">
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
