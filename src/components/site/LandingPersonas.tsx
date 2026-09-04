type LandingPersonasProps = {
  shopMonthlyLabel: string;
};

const personas = [
  {
    who: "Duka owner",
    what: "RETAIL DUKA",
    pain: "Manual ledger books, lost credit records, unmatched M-Pesa texts.",
    fix: "2-tap credit recording and STK that posts to the sale.",
    image: "/images/landing/persona-duka.png",
    alt: "Duka owners in a stockroom with inventory bags and boxes",
  },
  {
    who: "Boutique & chemist",
    what: "SPECIALTY RETAIL",
    pain: "Stock leakage, unknown margins, unpredictable reorder cycles.",
    fix: "Stock alerts, restock notes and fiscal invoice on every paid sale.",
    image: "/images/landing/persona-boutique.png",
    alt: "Family shopping in a specialty chemist or boutique",
  },
  {
    who: "Two counters, one owner",
    what: "HARDWARE + DUKA",
    pain: "Two tills, two books, one head — stock must stay separate.",
    fix: "Each location is its own shop. Pay on M-Pesa, switch counters.",
    image: "/images/landing/persona-hardware.png",
    alt: "Hardware shop counter with customer and shopkeeper",
  },
] as const;

export function LandingPersonas({ shopMonthlyLabel }: LandingPersonasProps) {
  return (
    <section className="w-full bg-[#F7F4EF]">
      <div className="flex w-full flex-col gap-5 px-6 py-10 sm:px-10 sm:py-12 lg:gap-6 lg:px-12 xl:px-16">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Made for these owners
        </h2>

        <div className="grid w-full gap-4 md:grid-cols-3 lg:gap-5">
          {personas.map((p) => (
            <article
              key={p.who}
              className="overflow-hidden rounded-[20px] border border-border bg-white"
            >
              <div className="relative h-40 w-full overflow-hidden sm:h-44">
                <img
                  src={p.image}
                  alt={p.alt}
                  className="absolute inset-0 size-full object-cover"
                  width={512}
                  height={176}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex flex-col gap-1.5 px-5 pt-4 pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">{p.who}</h3>
                <p className="text-muted-foreground text-[10px] font-medium tracking-[1.5px] uppercase">
                  {p.what}
                </p>
                <p className="text-muted-foreground text-[13px] leading-5">{p.pain}</p>
                <p className="text-primary text-[13px] leading-5 font-medium">
                  {p.who === "Two counters, one owner"
                    ? `Each location is its own shop at ${shopMonthlyLabel}. Pay on M-Pesa, switch counters.`
                    : p.fix}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
