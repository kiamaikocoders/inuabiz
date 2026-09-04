const tracker = [
  { n: 1, label: "Account" },
  { n: 2, label: "Shop pin" },
  { n: 3, label: "M-Pesa" },
  { n: 4, label: "First sale" },
] as const;

const steps = [
  {
    n: "01",
    time: "30s",
    title: "Create your account",
    body: "Name, shop, email and password — confirm with email OTP.",
    image: "/images/landing/step-01.png",
    alt: "Shop owner setting up an InuaBiz account at a market stall",
  },
  {
    n: "02",
    time: "45s",
    title: "Business & GPS pin",
    body: "Shop category and one-tap location detection.",
    image: "/images/landing/step-02.png",
    alt: "Eatery GPS pin for shop location setup",
  },
  {
    n: "03",
    time: "30s",
    title: "Payment destination",
    body: "Add M-Pesa number, Till or Paybill. Trial starts here.",
    image: "/images/landing/step-03.png",
    alt: "Boutique owner adding M-Pesa payment destination",
  },
  {
    n: "04",
    time: "15s",
    title: "First sale",
    body: "Add a product, ring it up on the till.",
    image: "/images/landing/step-04.png",
    alt: "First sale ringing up at a butcher counter",
    highlight: true,
  },
] as const;

export function LandingSteps() {
  return (
    <section className="w-full bg-white">
      <div className="flex w-full flex-col gap-5 px-6 py-10 sm:px-10 sm:py-12 lg:gap-6 lg:px-12 xl:px-16">
        <div className="space-y-1">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Four steps to your first sale
          </h2>
          <p className="text-primary text-base font-medium">
            Onboarded in under two minutes
          </p>
          <p className="text-muted-foreground text-sm sm:text-base">
            No paperwork. Real sales on a real till.
          </p>
        </div>

        {/* Progress tracker — full width, connectors stretch end to end */}
        <div className="hidden w-full items-start md:flex">
          {tracker.map((t, i) => (
            <div key={t.n} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full font-display text-[13px] font-bold">
                  {t.n}
                </div>
                <span className="text-primary text-[11px] font-medium whitespace-nowrap">
                  {t.label}
                </span>
              </div>
              {i < tracker.length - 1 ? (
                <div className="bg-primary mt-[16px] mx-2 h-[3px] min-w-0 flex-1 rounded-sm" />
              ) : null}
            </div>
          ))}
        </div>

        {/* Step cards — edge to edge within page gutters */}
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {steps.map((s) => (
            <article
              key={s.n}
              className={`overflow-hidden rounded-2xl border bg-white shadow-[0px_8px_24px_-4px_rgba(18,23,23,0.1)] ${
                s.highlight ? "border-primary border-2" : "border-border"
              }`}
            >
              <div className="relative h-32 w-full overflow-hidden sm:h-36">
                <img
                  src={s.image}
                  alt={s.alt}
                  className="absolute inset-0 size-full object-cover"
                  width={400}
                  height={144}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex flex-col gap-1.5 px-4 pt-3 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="bg-primary-soft text-primary border-primary/45 grid size-7 place-items-center rounded-md border font-display text-[11px] font-bold">
                    {s.n}
                  </span>
                  <span className="text-gold text-xs font-medium">{s.time}</span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{s.title}</h3>
                <p className="text-muted-foreground text-xs leading-snug">{s.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
