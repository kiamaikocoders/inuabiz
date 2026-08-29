import { useEffect, useState } from "react";
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
import { saveCustomer } from "@/lib/data";
import type { Customer } from "@/lib/mock-data";

export type CustomerDraft = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

function draftFrom(customer?: Customer | null): CustomerDraft {
  return {
    id: customer?.id,
    name: customer?.name && customer.name !== "Customer" ? customer.name : "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    notes: customer?.notes ?? "",
  };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (id: string) => void;
}) {
  const editing = Boolean(customer?.id);
  const [draft, setDraft] = useState<CustomerDraft>(() => draftFrom(customer));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDraft(draftFrom(customer));
  }, [open, customer]);

  const save = async () => {
    setBusy(true);
    try {
      const { id } = await saveCustomer({
        id: draft.id,
        name: draft.name,
        phone: draft.phone,
        email: draft.email,
        notes: draft.notes,
      });
      toast.success(editing ? "Customer updated" : "Customer added");
      onOpenChange(false);
      onSaved?.(id);
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>
            Name and phone are enough. Email is used for duka-debt reminders.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Name</Label>
            <Input
              id="cust-name"
              placeholder="Mama Njeri"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-phone">Mobile</Label>
            <Input
              id="cust-phone"
              inputMode="tel"
              placeholder="0712 345 678"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-email">Email (optional)</Label>
            <Input
              id="cust-email"
              type="email"
              placeholder="nina.v@example.com"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-notes">Notes (optional)</Label>
            <Textarea
              id="cust-notes"
              placeholder="Prefers 2kg unga, pays on Friday…"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" disabled={busy} onClick={() => void save()}>
            {editing ? "Save changes" : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
