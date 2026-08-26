import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Forest overlay so Kenyan shop photos stay readable without hiding them. */
const OVERLAY =
  "linear-gradient(180deg, rgba(5, 40, 30, 0.52) 0%, rgba(11, 110, 79, 0.22) 42%, rgba(4, 26, 20, 0.78) 100%)";

export function ScenePane({
  image,
  imageAlt,
  children,
  className,
}: {
  image: string;
  imageAlt: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={image}
        alt={imageAlt}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: OVERLAY }} aria-hidden />
      <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
    </div>
  );
}
