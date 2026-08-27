import { useRef, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assertLogoFile } from "@/lib/business-logo";
import { initials } from "@/lib/identity";
import { cn } from "@/lib/utils";

export function ShopLogoPicker({
  url,
  name,
  disabled,
  onFile,
  compact,
  className,
  title = "Shop photo",
  hint = "Optional. JPEG, PNG or WebP, under 2 MB. Shows on your profile and receipts.",
  tone = "vendor",
}: {
  url?: string | null;
  name: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  compact?: boolean;
  className?: string;
  title?: string;
  hint?: string;
  tone?: "vendor" | "admin";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      assertLogoFile(file);
      onFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not use that photo");
    }
  };

  return (
    <div className={cn("flex items-center gap-4", compact && "gap-3", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={pick}
        aria-label={url ? `Change ${title.toLowerCase()}` : `Upload ${title.toLowerCase()}`}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full",
          compact ? "size-16" : "size-20",
          disabled ? "cursor-default" : "cursor-pointer",
        )}
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span
            className={cn(
              "grid size-full place-items-center text-lg font-bold",
              tone === "admin" ? "bg-foreground text-background" : "bg-primary-soft text-primary",
            )}
          >
            {initials(name)}
          </span>
        )}
        {!disabled && compact && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/50 py-1 text-white">
            <Camera className="size-3.5" strokeWidth={2.4} />
          </span>
        )}
        {!disabled && !compact && (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100">
            <Camera className="size-5" strokeWidth={2.2} />
          </span>
        )}
      </button>
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{hint}</p>
          {!disabled && (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={pick}>
              {url ? "Change photo" : "Upload photo"}
            </Button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
      />
    </div>
  );
}
