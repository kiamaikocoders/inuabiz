import { CATEGORY_LIST, type BusinessCategory } from "@/lib/category";
import { cn } from "@/lib/utils";

export function CategoryPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (id: BusinessCategory) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
      )}
      role="group"
      aria-label="Shop category"
    >
      {CATEGORY_LIST.map((c) => {
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(c.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <p className="text-sm font-semibold">
              <span className="mr-1.5" aria-hidden>
                {c.emoji}
              </span>
              {c.label}
            </p>
            {!compact && (
              <p
                className={cn(
                  "mt-1 text-xs leading-relaxed",
                  selected ? "text-primary-foreground/85" : "text-muted-foreground",
                )}
              >
                {c.blurb}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
