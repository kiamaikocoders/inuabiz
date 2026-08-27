import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { cn } from "@/lib/utils";

export type LegalTocItem = { id: string; label: string };

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    if (ids.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ids]);

  return active;
}

export function LegalDocument({
  title,
  effective,
  image,
  imageAlt,
  toc,
  children,
}: {
  title: string;
  effective: string;
  image: string;
  imageAlt: string;
  toc: LegalTocItem[];
  children: ReactNode;
}) {
  const ids = toc.map((t) => t.id);
  const active = useActiveSection(ids);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative h-[300px] overflow-hidden sm:h-[360px]">
          <img src={image} alt={imageAlt} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-[#085540]/50" aria-hidden />
          <div className="relative z-10 flex h-full flex-col items-center px-6 pt-16 text-center sm:pt-20">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-white/85">Effective {effective}</p>
          </div>
          <div
            className="pointer-events-none absolute -bottom-24 left-1/2 h-52 w-[180%] -translate-x-1/2 rounded-[50%] bg-background"
            aria-hidden
          />
        </section>

        <div className="relative z-10 grid gap-12 px-8 pb-20 pt-6 lg:grid-cols-[280px_minmax(0,760px)] xl:px-20">
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="sticky top-24 space-y-4">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={cn(
                      "block text-sm transition-colors",
                      active === item.id
                        ? "border-gold text-primary border-l-[3px] pl-3 font-semibold"
                        : "text-muted-foreground hover:text-foreground pl-3",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-[22px] font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
