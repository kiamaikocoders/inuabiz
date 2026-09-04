import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES } from "@/lib/mock-data";
import { invokeFunction } from "@/lib/supabase";
import { fetchBillInvoices } from "@/lib/payments";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices & e-billing — InuaBiz" },
      {
        name: "description",
        content:
          "Create wholesale invoices, track paid and overdue bills, and push digital invoices into your buyer's M-Pesa Bill Manager menu.",
      },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const queryClient = useQueryClient();
  const { data: live = [] } = useQuery({
    queryKey: ["bill-invoices"],
    queryFn: fetchBillInvoices,
  });
  const invoices = live;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const outstanding = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "Paid" && i.status !== "DRAFT" && i.status !== "Draft")
    .reduce((s, i) => s + i.amount, 0);
  const paid = invoices
    .filter((i) => i.status === "PAID" || i.status === "Paid")
    .reduce((s, i) => s + i.amount, 0);

  const send = async () => {
    const kes = Number(amount);
    if (!buyer.trim() || !phone.trim() || !(kes > 0)) {
      toast.error("Name, phone and amount are required");
      return;
    }
    setBusy(true);
    const { data, error } = await invokeFunction<{ ok?: boolean; message?: string }>(
      "create-bill-invoice",
      {
        billed_full_name: buyer.trim(),
        billed_phone: phone,
        invoice_name: description.trim() || `Invoice for ${buyer.trim()}`,
        amount: kes,
        invoice_items: description.trim()
          ? [{ item_name: description.trim(), amount: kes }]
          : undefined,
      },
    );
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Invoice not sent", {
        description:
          error ??
          "Bill Manager opt-in may still be pending on Safaricom. You can still take M-Pesa on the till.",
      });
      return;
    }
    setOpen(false);
    setBuyer("");
    setPhone("");
    setAmount("");
    setDescription("");
    toast.success("Invoice pushed to M-Pesa", {
      description: data.message ?? "The buyer will see it under Bill Manager.",
    });
    void queryClient.invalidateQueries({ queryKey: ["bill-invoices"] });
  };

  const cancelInvoice = async (id: string) => {
    setBusy(true);
    const { data, error } = await invokeFunction<{ ok?: boolean; message?: string }>(
      "cancel-bill-invoice",
      { bill_invoice_id: id },
    );
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Could not cancel", { description: error ?? "Safaricom rejected the cancel." });
      return;
    }
    toast.success("Invoice cancelled");
    void queryClient.invalidateQueries({ queryKey: ["bill-invoices"] });
  };

  return (
    <AppShell
      title="Invoices"
      description="Wholesale billing and M-Pesa Bill Manager"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> New invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an invoice</DialogTitle>
              <DialogDescription>
                The bill lands in the buyer's M-Pesa menu with the amount and reference pre-filled.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="bn">Buyer name</Label>
                <Input
                  id="bn"
                  placeholder="Kariobangi Wholesalers"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp">Buyer phone</Label>
                  <Input
                    id="bp"
                    placeholder="0722 000 411"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ba">Amount</Label>
                  <Input
                    id="ba"
                    type="number"
                    placeholder="84500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bd">Description</Label>
                <Textarea
                  id="bd"
                  rows={3}
                  placeholder="20 cartons cooking oil, 10 bales unga…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" disabled={busy} onClick={() => void send()}>
                <Send className="mr-2 size-4" /> Create and send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={KES(outstanding)} icon={FileText} tone="gold" />
        <StatCard label="Paid this month" value={KES(paid)} />
        <StatCard
          label="Overdue"
          value={String(invoices.filter((i) => i.status === "Overdue" || i.status === "FAILED").length)}
          tone="danger"
        />
        <StatCard
          label="Drafts"
          value={String(invoices.filter((i) => i.status === "Draft" || i.status === "DRAFT").length)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-primary-soft p-4">
        <p className="text-primary text-sm font-semibold">M-Pesa Bill Manager</p>
        <p className="text-primary/85 mt-1 text-sm leading-relaxed">
          Invoices push into the buyer's M-Pesa Super App. Payment marks the row PAID via Daraja
          callback. This needs a successful Bill Manager opt-in (`app_key`) on the sandbox app.
        </p>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">All invoices</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.number}</TableCell>
                  <TableCell>{i.buyer}</TableCell>
                  <TableCell className="text-muted-foreground">{i.phone}</TableCell>
                  <TableCell className="text-right font-semibold">{KES(i.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{i.issued}</TableCell>
                  <TableCell className="text-muted-foreground">{i.due}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.channel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        i.status === "Paid" || i.status === "PAID"
                          ? "secondary"
                          : i.status === "Overdue" || i.status === "FAILED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {i.status === "SENT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void cancelInvoice(i.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
