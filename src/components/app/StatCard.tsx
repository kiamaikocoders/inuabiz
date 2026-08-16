import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  tone?: "default" | "gold" | "danger";
}) {
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon && (
          <span
            className={cn(
              "grid size-9 place-items-center rounded-lg",
              tone === "gold" && "bg-gold/20 text-gold-foreground",
              tone === "danger" && "bg-destructive/12 text-destructive",
              tone === "default" && "bg-primary-soft text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
