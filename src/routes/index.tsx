import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/site/LandingHero";
import { LandingSteps } from "@/components/site/LandingSteps";
import { LandingPersonas } from "@/components/site/LandingPersonas";
import { LandingStats } from "@/components/site/LandingStats";
import { SiteFooter } from "@/components/site/SiteFooter";
import { COMPLIANCE_PRICE, KES, SUBSCRIPTION_PRICE } from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import {
  faqJsonLd,
  organizationJsonLd,
  pageHead,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "InuaBiz (Inua Biz) — Kenya POS & M-Pesa till for dukas",
      description:
        "InuaBiz is Kenya's micro-POS for dukas, boutiques, chemists and eateries. Ring sales, reconcile M-Pesa Till/Paybill and companion SMS, track kukopesha credit and restock with AI — from your phone.",
      path: "/",
      ogTitle: "InuaBiz — Lift your business from your phone",
      ogDescription:
        "Kenya micro-POS: M-Pesa till, credit ledger, stock alerts and AI restock. Free trial, no paperwork.",
      jsonLd: [
        organizationJsonLd(),
        websiteJsonLd(),
        softwareApplicationJsonLd(),
        faqJsonLd([
          {
            question: "What is InuaBiz?",
            answer:
              "InuaBiz (also written Inua Biz) is a mobile-first point-of-sale for Kenyan MSMEs. It combines a till, M-Pesa reconciliation, customer credit ledger, inventory alerts and AI restock advice.",
          },
          {
            question: "Does InuaBiz work with M-Pesa?",
            answer:
              "Yes. Customers pay your Buy Goods Till, Paybill or personal M-Pesa. InuaBiz posts matched payments — via companion SMS, manual receipt code or C2B — to the same sale in your till book.",
          },
          {
            question: "Who is InuaBiz for?",
            answer:
              "Kenyan dukas, boutiques, chemists, eateries and multi-shop owners who want a phone-based POS without heavy paperwork.",
          },
        ]),
      ],
    }),
  component: Landing,
});

function Landing() {
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const shop = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const compliance = pricing?.compliance ?? COMPLIANCE_PRICE;

  return (
    <div className="min-h-screen">
      <LandingHero />

      <main>
        <LandingStats shopMonthlyLabel={KES(shop)} />

        <LandingSteps />
        <LandingPersonas shopMonthlyLabel={KES(shop)} />

        {/* Pricing teaser */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="bg-hero-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-lift sm:px-12">
            <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
            <div className="relative">
              <Wallet className="text-gold mx-auto size-8" />
              <h2 className="text-primary-foreground mt-4 text-3xl font-bold sm:text-4xl">
                From {KES(shop)} per shop. More when you need it.
              </h2>
              <p className="text-primary-foreground/80 mx-auto mt-3 max-w-xl">
                Standard from {KES(shop)} per shop / month. Compliance (ETR) at {KES(compliance)}{" "}
                when you need ETR-format receipts. Custom licenses for dedicated infrastructure.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/signup">Start free trial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/pricing">
                    <CreditCard className="mr-1 size-4" /> Standard, Compliance, Enterprise
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
