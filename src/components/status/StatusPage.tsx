import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StatusAction = {
  label: string;
  to?: string;
  onClick?: () => void;
};

/**
 * Full-screen status layout matching the Figma status set (404, 500, offline, etc.).
 */
export function StatusPage({
  icon: Icon,
  code,
  title,
  description,
  primary,
  secondary,
  meta,
  documentTitle,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  description: string;
  primary: StatusAction;
  secondary: StatusAction;
  meta: string;
  documentTitle?: string;
}) {
  useEffect(() => {
    if (documentTitle) document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F7F4EF] text-foreground dark:bg-[#0D1612] dark:text-[#F7F4EF]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 70% 18%, rgba(244,162,97,0.28), transparent 55%), radial-gradient(ellipse at 8% 40%, rgba(11,110,79,0.10), transparent 50%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:px-12">
        <Link to="/" aria-label="InuaBiz home">
          <Logo />
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-border bg-transparent px-3.5 py-2 text-[13px] font-semibold shadow-none"
          asChild
        >
          <a href="/">Back to Home</a>
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[18px] px-4 pb-12 pt-8 text-center sm:px-12">
        <span className="grid size-[80px] place-items-center rounded-[24px] border border-gold/35 bg-gold/14 text-gold">
          <Icon className="size-9" strokeWidth={2.25} />
        </span>
        {code ? (
          <p className="font-display text-[72px] leading-none font-bold tracking-[-2px] text-gold sm:text-[96px]">
            {code}
          </p>
        ) : null}
        <h1 className="font-display max-w-[540px] text-[28px] font-bold sm:text-[32px]">{title}</h1>
        <p className="text-muted-foreground max-w-[520px] text-base leading-[26px]">
          {description}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatusButton action={primary} variant="gold" />
          <StatusButton action={secondary} variant="outline" />
        </div>
        <p className="text-muted-foreground text-xs">{meta}</p>
      </main>
    </div>
  );
}

/**
 * Compact empty state for in-app lists, using the same icon well and gold CTAs.
 */
export function StatusEmpty({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  meta,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primary: StatusAction;
  secondary?: StatusAction;
  meta?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 px-4 py-12 text-center", className)}>
      <span className="grid size-16 place-items-center rounded-[20px] border border-gold/35 bg-gold/14 text-gold">
        <Icon className="size-7" strokeWidth={2.25} />
      </span>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusButton action={primary} variant="gold" />
        {secondary ? <StatusButton action={secondary} variant="outline" /> : null}
      </div>
      {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
    </div>
  );
}

function StatusButton({ action, variant }: { action: StatusAction; variant: "gold" | "outline" }) {
  const className = "h-auto rounded-[12px] px-[22px] py-[14px] text-[14px] font-semibold";
  const inner: ReactNode = action.label;

  if (action.to) {
    return (
      <Button variant={variant} className={className} asChild>
        <Link
          to={action.to as never}
          {...(action.onClick ? { onClick: action.onClick } : {})}
        >
          {inner}
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={action.onClick}>
      {inner}
    </Button>
  );
}
