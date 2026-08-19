import { cn } from "@/lib/utils";

/**
 * Option A mark — lifted duka. Forest squircle, gold awning, cream doorway.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect width="96" height="96" rx="24" fill="#0B6E4F" />
      <path d="M10 42L48 16L86 42H74L48 26L22 42H10Z" fill="#F4A261" />
      <path d="M35 84V58c0-3.3 2.7-6 6-6h14c3.3 0 6 2.7 6 6v26H35Z" fill="#F7F4EF" />
      <rect x="28" y="78" width="40" height="6" rx="3" fill="#F4A261" />
    </svg>
  );
}

/**
 * InuaBiz lockup: lifted-duka mark plus Space Grotesk wordmark.
 */
export function Logo({
  className,
  tone = "default",
  showWord = true,
}: {
  className?: string;
  tone?: "default" | "inverted";
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark
        className={cn("shadow-soft", tone === "inverted" && "ring-1 ring-white/25")}
        {...(showWord ? {} : { title: "InuaBiz" })}
      />
      {showWord && (
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            tone === "inverted" ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Inua<span className="text-gold">Biz</span>
        </span>
      )}
    </span>
  );
}
