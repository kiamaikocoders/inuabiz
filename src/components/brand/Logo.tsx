import { cn } from "@/lib/utils";

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
      <span className="bg-gold-gradient text-gold-foreground grid size-8 shrink-0 place-items-center rounded-[10px] font-display text-[15px] font-bold shadow-soft">
        iB
      </span>
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
