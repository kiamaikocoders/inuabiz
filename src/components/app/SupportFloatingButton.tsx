import { Link } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Floating support entry on vendor screens (POS, inventory, etc.).
 */
export function SupportFloatingButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "fixed right-4 bottom-20 z-50 size-12 rounded-full shadow-lg lg:bottom-6",
        className,
      )}
      onClick={onClick}
      aria-label="Get support"
    >
      <LifeBuoy className="size-5" />
    </Button>
  );
}

export function SupportNavLink() {
  return (
    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
      <Link to="/app/support" search={{}}>
        <LifeBuoy className="mr-2 size-4" /> Support
      </Link>
    </Button>
  );
}
