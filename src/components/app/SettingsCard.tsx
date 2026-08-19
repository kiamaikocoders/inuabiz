import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * White settings card matching the addons Figma: title, muted subtitle, optional action.
 */
export function SettingsCard({
  title,
  description,
  action,
  locked = false,
  children,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  locked?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "surface-card space-y-5 p-6",
        locked && "pointer-events-none opacity-55 select-none",
        className,
      )}
      aria-disabled={locked || undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Forest role pill used on settings headers.
 */
export function RoleBadge({ children }: { children: ReactNode }) {
  return (
    <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </span>
  );
}
