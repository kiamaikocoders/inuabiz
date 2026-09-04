import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/contact", label: "Contact" },
] as const;

export function LandingHero() {
  return (
    <section className="relative flex min-h-dvh min-h-screen w-full flex-col overflow-hidden bg-[#053828] text-white">
      {/* Blue-hour boutique underlay */}
      <img
        src="/images/hero/inuabiz-hero-bg-bluehour-boutique.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        width={1376}
        height={768}
        loading="eager"
        decoding="async"
      />
      {/* Forest wash so copy + devices stay readable */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#053828]/72"
        aria-hidden
      />
      <div
        className="bg-grid-hero pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{ backgroundColor: "transparent" }}
      />

      <header className="relative z-20 flex h-16 w-full shrink-0 items-center justify-between px-6 sm:px-10 xl:px-16">
        <Link to="/" aria-label="InuaBiz home" className="shrink-0">
          <Logo tone="inverted" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className="transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 text-sm font-medium md:flex">
          <Link to="/login" className="text-white/80 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110"
          >
            Start free trial <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Start free trial</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 items-center gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[minmax(0,38%)_minmax(0,62%)] lg:gap-4 lg:px-10 lg:py-6 xl:px-14">
        {/* Left copy — stays left-aligned, never overlapped */}
        <div className="relative z-20 w-full max-w-xl justify-self-start text-left lg:pr-4">
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
            <span className="block">InuaBiz</span>
            <span className="mt-1 block text-[0.72em] font-semibold sm:text-[0.68em]">
              Lift your business
              <span className="text-gold"> from your phone.</span>
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
            InuaBiz is the Kenya POS built for dukas, boutiques, chemists and eateries. Sell
            fast, reconcile M-Pesa automatically, track customer credit and let AI tell you what
            to restock next.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" className="bg-[#F7F4EF] text-[#053828] hover:bg-white" asChild>
              <Link to="/signup">
                Start free trial <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-gold" /> No business registration needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-gold" /> Works on any smartphone
            </span>
          </div>
        </div>

        {/* Right column 62% — mockup scaled up into the dead space */}
        <div className="relative z-10 flex min-h-[20rem] w-full items-center justify-center overflow-visible sm:min-h-[24rem] lg:h-full lg:min-h-0 lg:justify-end">
          <img
            src="/images/hero/inuabiz-hero-cluster-clean.png?v=5"
            alt="InuaBiz on laptop (sales & AI), tablet (credit ledger), and phone (till)"
            className="h-auto w-full max-w-none origin-center object-contain lg:origin-right lg:scale-[1.28] lg:-mr-[8%] xl:scale-[1.38] xl:-mr-[12%]"
            width={1376}
            height={768}
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
