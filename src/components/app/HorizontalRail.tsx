import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontal snap-scroll rail for phone-dense dashboard sections. */
export function HorizontalRail({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
        {hint ? <span className="text-muted-foreground text-[11px]">{hint}</span> : null}
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

export function RailCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-card snap-start shrink-0 rounded-2xl p-3.5", className)}>
      {children}
    </div>
  );
}
