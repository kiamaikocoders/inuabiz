import { cn } from "@/lib/utils";

const pillClass: Record<string, string> = {
  Active: "bg-success/15 text-success border-success/30",
  Trial: "bg-warning/20 text-warning-foreground border-warning/40",
  Error: "bg-destructive/15 text-destructive border-destructive/30",
  Suspended: "bg-muted text-muted-foreground border-border",
  Healthy: "bg-success/15 text-success border-success/30",
  Degraded: "bg-warning/20 text-warning-foreground border-warning/40",
  Critical: "bg-destructive/15 text-destructive border-destructive/30",
  Completed: "bg-success/15 text-success border-success/30",
  Delivered: "bg-success/15 text-success border-success/30",
  Failed: "bg-destructive/15 text-destructive border-destructive/30",
  Unclaimed: "bg-destructive/15 text-destructive border-destructive/30",
  Sent: "bg-success/15 text-success border-success/30",
  Draft: "bg-muted text-muted-foreground border-border",
  Scheduled: "bg-warning/20 text-warning-foreground border-warning/40",
  "In progress": "bg-info/15 text-info border-info/30",
  "To-do": "bg-warning/20 text-warning-foreground border-warning/40",
  "Daraja STK": "bg-success/15 text-success border-success/30",
  "Ratiba on": "bg-success/15 text-success border-success/30",
  "Manual STK": "bg-muted text-muted-foreground border-border",
  Connected: "bg-success/15 text-success border-success/30",
  "Token present": "bg-success/15 text-success border-success/30",
};

const dotClass: Record<string, string> = {
  Active: "bg-success",
  Trial: "bg-warning",
  Error: "bg-destructive",
  Suspended: "bg-muted-foreground",
  Healthy: "bg-success",
  Degraded: "bg-warning",
  Critical: "bg-destructive",
  Completed: "bg-success",
  Delivered: "bg-success",
  Failed: "bg-destructive",
  Unclaimed: "bg-destructive",
  Sent: "bg-success",
  Draft: "bg-muted-foreground",
  Scheduled: "bg-warning",
  "In progress": "bg-info",
  "To-do": "bg-warning",
  "Daraja STK": "bg-success",
  "Ratiba on": "bg-success",
  "Manual STK": "bg-muted-foreground",
  Connected: "bg-success",
  "Token present": "bg-success",
};

/**
 * Coloured status pill used across the admin command centre.
 */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        pillClass[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", dotClass[status] ?? "bg-muted-foreground")}
        aria-hidden
      />
      {status}
    </span>
  );
}
