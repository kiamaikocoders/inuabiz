import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export type JourneySlide = {
  n: string;
  stage: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  imageClassName?: string;
  href: string;
};

export function HowItWorksCarousel({ slides }: { slides: JourneySlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || paused) return;
    const id = window.setInterval(() => api.scrollNext(), 4500);
    return () => window.clearInterval(id);
  }, [api, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-8 flex flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-20">
        <div className="max-w-xl">
          <p className="text-gold text-xs font-semibold tracking-[0.18em]">ALSO IN THE LOOP</p>
          <h2 className="mt-2 text-3xl font-bold">Credit, invoices, and the morning after</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            A looping carousel — the rest of the till, without another wall of steps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-primary text-xs font-medium">{paused ? "Paused" : "Auto-loop"}</p>
          <button
            type="button"
            aria-label="Previous slide"
            className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-full"
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-full"
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start", skipSnaps: false }}
        className="w-full px-4 sm:px-6 lg:px-20"
      >
        <CarouselContent className="-ml-5">
          {slides.map((slide, i) => (
            <CarouselItem
              key={slide.n}
              className="pl-5 basis-[min(360px,85vw)] md:basis-[360px]"
            >
              <article
                className={cn(
                  "overflow-hidden rounded-[20px] border bg-card shadow-soft",
                  selected === i ? "border-gold border-2" : "border-border",
                )}
              >
                <div className="relative h-[210px] overflow-hidden">
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    className={cn("size-full object-cover", slide.imageClassName)}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(8, 85, 64, 0.5) 0%, rgba(8, 85, 64, 0.08) 45%, transparent 100%)",
                    }}
                    aria-hidden
                  />
                  <span className="bg-gold text-gold-foreground absolute bottom-4 left-4 grid size-11 place-items-center rounded-full font-display text-sm font-bold">
                    {slide.n}
                  </span>
                </div>
                <div className="space-y-2.5 p-5 pt-7">
                  <p className="text-gold-foreground bg-gold/25 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    {slide.stage}
                  </p>
                  <h3 className="text-lg font-bold leading-snug">{slide.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{slide.body}</p>
                  <Link
                    to={slide.href}
                    className="text-primary inline-flex pt-1 text-sm font-semibold hover:underline"
                  >
                    See how it lands on the till →
                  </Link>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Carousel slides">
        {slides.map((slide, i) => (
          <button
            key={slide.n}
            type="button"
            role="tab"
            aria-selected={selected === i}
            aria-label={`Go to ${slide.title}`}
            className={cn(
              "h-2 rounded-full transition-all",
              selected === i ? "bg-gold w-6" : "bg-border w-2",
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
