import { cn } from "@/lib/utils";

export function ProductThumb({
  src,
  alt,
  emoji = "📦",
  className,
}: {
  /** Explicit undefined allowed — product.imageUrl is often string | null | undefined. */
  src?: string | null | undefined;
  alt: string;
  emoji?: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={cn("block object-cover", className)} />;
  }
  return (
    <span className={cn("bg-muted grid place-items-center text-lg", className)} aria-hidden>
      {emoji}
    </span>
  );
}
