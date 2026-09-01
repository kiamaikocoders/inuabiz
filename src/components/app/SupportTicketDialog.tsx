import { useEffect, useState } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  captureSupportContext,
  createSupportTicket,
  supportCategoryLabel,
  type SupportCategory,
} from "@/lib/support-tickets";

export function SupportTicketDialog({
  open,
  onOpenChange,
  defaultSubject = "",
  contextExtra,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject?: string;
  contextExtra?: Record<string, unknown>;
  onCreated?: (ticketId: string) => void;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportCategory>("other");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setMessage("");
      setCategory("other");
    }
  }, [open, defaultSubject]);

  const submit = async () => {
    setBusy(true);
    try {
      const { ticketId, aiReply } = await createSupportTicket({
        subject,
        message,
        category,
        context: captureSupportContext(contextExtra),
      });
      toast.success("Support ticket opened", {
        description: aiReply
          ? "Our assistant replied instantly — check Support for the thread."
          : "The InuaBiz team will follow up shortly.",
      });
      onOpenChange(false);
      onCreated?.(ticketId);
    } catch (err) {
      toast.error("Could not open ticket", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="size-5 text-primary" /> Report an issue
          </DialogTitle>
          <DialogDescription>
            We attach your current page and device details so support can diagnose faster. Money
            issues are prioritised.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="support-subject">Subject</Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. M-Pesa payment stuck on pending"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["payment", "pos_hardware", "inventory", "billing", "other"] as SupportCategory[]
                ).map((c) => (
                  <SelectItem key={c} value={c}>
                    {supportCategoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="support-message">What happened?</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue — amount, time, customer phone if relevant…"
              className="mt-1.5 min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || subject.trim().length < 3 || message.trim().length < 8}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send to support
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
