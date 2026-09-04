import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SoftPermissionPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  allowLabel: string;
  laterLabel?: string;
  busy?: boolean;
  onAllow: () => void;
  onLater: () => void;
};

/**
 * Pre-browser soft prompt — explains why we need a permission before the
 * native Allow/Block dialog. Matches the Enable Notifications modal layout.
 */
export function SoftPermissionPrompt({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  allowLabel,
  laterLabel = "Later",
  busy = false,
  onAllow,
  onLater,
}: SoftPermissionPromptProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onLater();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border-border/60 p-0 sm:max-w-[400px]",
          "[&>button]:hidden",
        )}
        aria-describedby="soft-permission-desc"
      >
        <DialogHeader className="space-y-0 p-5 pb-4 text-left sm:text-left">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl shadow-[0_0_24px_-4px_var(--primary)]">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
          </div>
          <DialogDescription
            id="soft-permission-desc"
            className="text-muted-foreground mt-4 text-sm leading-relaxed"
          >
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/60 border-t px-5 py-4">
          <DialogFooter className="flex-row gap-3 sm:justify-stretch sm:space-x-0">
            <Button
              className="h-11 flex-1 rounded-xl shadow-[0_0_20px_-6px_var(--primary)]"
              disabled={busy}
              onClick={onAllow}
            >
              {busy ? "Working…" : allowLabel}
            </Button>
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-xl"
              disabled={busy}
              onClick={onLater}
            >
              {laterLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
