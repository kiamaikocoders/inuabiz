import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { KES, invoices } from "@/lib/mock-data";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices & e-billing — InuaBiz" },
      {
        name: "description",
        content:
          "Create wholesale invoices, track paid and overdue bills, and push digital invoices into your buyer's M-Pesa Bill Manager menu.",
      },
      { property: "og:title", content: "InuaBiz invoices" },
      {
        property: "og:description",
        content: "Wholesale invoicing with M-Pesa Bill Manager push and automatic reconciliation.",
      },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const [open, setOpen] = useState(false);

  const outstanding = invoices
    .filter((i) => i.status !== "Paid" && i.status !== "Draft")
    .reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);

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
                <Input id="bn" placeholder="Kariobangi Wholesalers" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp">Buyer phone</Label>
                  <Input id="bp" placeholder="0722 000 411" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ba">Amount</Label>
                  <Input id="ba" type="number" placeholder="84500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bd">Description</Label>
                <Textarea id="bd" rows={3} placeholder="20 cartons cooking oil, 10 bales unga…" />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  toast.success("Invoice created", {
                    description: "Bill Manager push will fire once the backend is wired.",
                  });
                }}
              >
                <Send className="mr-2 size-4" /> Create and send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={KES(outstanding)} icon={FileText} tone="gold" />
        <StatCard label="Paid this month" value={KES(paid)} delta={14} />
        <StatCard
          label="Overdue"
          value={String(invoices.filter((i) => i.status === "Overdue").length)}
          tone="danger"
        />
        <StatCard label="Drafts" value={String(invoices.filter((i) => i.status === "Draft").length)} />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-primary-soft p-4">
        <p className="text-primary text-sm font-semibold">M-Pesa Bill Manager · Phase 3</p>
        <p className="text-primary/85 mt-1 text-sm leading-relaxed">
          Invoices created here will push straight into the buyer's M-Pesa Super App menu with the
          amount, account reference and your Paybill pre-configured. Payment marks the invoice PAID
          instantly.
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
                        i.status === "Paid"
                          ? "secondary"
                          : i.status === "Overdue"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {i.status}
                    </Badge>
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
