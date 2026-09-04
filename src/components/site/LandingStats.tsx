import { Logo } from "@/components/brand/Logo";

type LandingStatsProps = {
  shopMonthlyLabel: string;
};

export function LandingStats({ shopMonthlyLabel }: LandingStatsProps) {
  const cards = [
    {
      title: "Onboarded in under two minutes",
      mid: "onboarding",
      footer: "Sign-up to first sale",
      image: "/images/landing/stats/stat-photo-01-onboarding.jpg?v=1",
      alt: "Stopwatch and phone on a desk for fast onboarding",
    },
    {
      title: "Till · Paybill · SMS",
      mid: "payments",
      footer: "M-Pesa on the till",
      image: "/images/landing/stats/stat-photo-02-payments.jpg?v=1",
      alt: "Phone payment SMS next to a shop till",
    },
    {
      title: shopMonthlyLabel,
      mid: "monthly",
      footer: "Per shop / month",
      image: "/images/landing/stats/stat-photo-03-monthly.jpg?v=1",
      alt: "Wallet with cash on a shop counter",
      accent: true,
    },
    {
      title: "AI restock notes",
      mid: "insights",
      footer: "From this shop’s sales",
      image: "/images/landing/stats/stat-photo-04-ai-restock.jpg?v=1",
      alt: "Stockroom shelf with restock notebook",
    },
  ] as const;

  return (
    <section className="w-full bg-[#E8E4DE] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-12">
      <div
        className="relative w-full overflow-hidden rounded-[28px] border border-[#C9C4BC]/80 px-4 py-5 shadow-[0_16px_40px_-12px_rgba(18,24,22,0.28)] sm:px-6 sm:py-6 lg:px-8"
        style={{
          backgroundImage:
            "linear-gradient(145deg, #F4F1EC 0%, #D9D4CC 42%, #EFEBE4 78%, #C8C3BB 100%)",
        }}
      >
        <div className="mb-4 flex items-center sm:mb-5">
          <div className="inline-flex items-center rounded-full border border-[#B8B2A8]/70 bg-[#F7F4EF]/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <Logo className="scale-90" />
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white shadow-[0_8px_20px_-8px_rgba(18,24,22,0.18)]"
            >
              <div className="px-4 pt-4">
                <h3
                  className={`font-display text-lg leading-tight font-bold sm:text-xl ${
                    card.accent ? "text-primary" : "text-foreground"
                  }`}
                >
                  {card.title}
                </h3>
              </div>

              <div className="relative mx-3 mt-2 aspect-[4/3] overflow-hidden rounded-xl">
                <img
                  src={card.image}
                  alt={card.alt}
                  className="absolute inset-0 size-full object-cover"
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <p className="text-muted-foreground mt-2 px-4 text-center text-[11px] tracking-wide lowercase">
                {card.mid}
              </p>

              <div className="mt-auto border-t border-[#EEEAE3] px-4 py-3">
                <p className="text-center text-sm font-medium text-foreground">{card.footer}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 px-1 sm:mt-5">
          <div
            className="h-2 w-24 rounded-full bg-primary/80 sm:w-32"
            style={{
              maskImage:
                "repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 10px)",
              WebkitMaskImage:
                "repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 10px)",
            }}
            aria-hidden
          />
          <div
            className="h-1.5 flex-1 max-w-xs rounded-full bg-[#A8A29A]/55"
            style={{
              maskImage:
                "repeating-linear-gradient(90deg, #000 0 10px, transparent 10px 16px)",
              WebkitMaskImage:
                "repeating-linear-gradient(90deg, #000 0 10px, transparent 10px 16px)",
            }}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
