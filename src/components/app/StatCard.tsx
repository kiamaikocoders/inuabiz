import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const iconTone = {
  default: "bg-info text-white shadow-[0_8px_18px_-8px] shadow-info",
  success: "bg-success text-white shadow-[0_8px_18px_-8px] shadow-success",
  gold: "bg-gold text-gold-foreground shadow-[0_8px_18px_-8px] shadow-gold",
  danger: "bg-destructive text-white shadow-[0_8px_18px_-8px] shadow-destructive",
  muted: "bg-slate-500 text-white shadow-[0_8px_18px_-8px] shadow-slate-500/70",
  violet: "bg-violet-500 text-white shadow-[0_8px_18px_-8px] shadow-violet-500/70",
  teal: "bg-teal-500 text-white shadow-[0_8px_18px_-8px] shadow-teal-500/70",
} as const;

/**
 * Metric tile for the admin dashboard. Saturated icon well with a white glyph,
 * matching the colourful reference dashboard.
 */
export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  tone?: keyof typeof iconTone;
}) {
  const positive = (delta ?? 0) >= 0;
  const pill =
    deltaLabel ?? (delta !== undefined ? `${positive ? "+" : "-"}${Math.abs(delta)}%` : null);

  return (
    <div className="surface-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={cn("grid size-10 shrink-0 place-items-center rounded-xl", iconTone[tone])}
          >
            <Icon className="size-5" strokeWidth={2.25} />
          </span>
        )}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-[28px] leading-none font-bold tracking-tight">{value}</p>
      {(pill || hint) && (
        <div className="flex flex-wrap items-center gap-2">
          {pill && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                delta !== undefined && !positive
                  ? "bg-destructive/12 text-destructive"
                  : "bg-success/15 text-success",
              )}
            >
              {pill}
            </span>
          )}
          {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
        </div>
      )}
    </div>
  );
}
