import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, MessageCircle, Plus, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { KES, debts } from "@/lib/mock-data";

export const Route = createFileRoute("/app/credit")({
  head: () => ({
    meta: [
      { title: "Duka debt ledger — InuaBiz" },
      {
        name: "description",
        content:
          "Digitise kukopesha: record customer credit in two taps, track balances and due dates, and send automated WhatsApp reminders.",
      },
      { property: "og:title", content: "InuaBiz duka debt ledger" },
      {
        property: "og:description",
        content: "Track who owes what and send WhatsApp reminders automatically.",
      },
    ],
  }),
  component: Credit,
});

function Credit() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = debts.filter((d) => d.customer.toLowerCase().includes(q.toLowerCase()));
  const total = debts.reduce((s, d) => s + d.amount, 0);
  const overdue = debts.filter((d) => d.status === "Overdue");

  return (
    <AppShell
      title="Duka debt"
      description="Customer credit — kukopesha, tracked properly"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Record credit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record new credit</DialogTitle>
              <DialogDescription>
                Two taps: who took it and how much. The due date defaults to 7 days.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cn">Customer phone or name</Label>
                <Input id="cn" placeholder="0722 431 002" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ca">Amount</Label>
                  <Input id="ca" type="number" placeholder="1200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cd">Due in (days)</Label>
                  <Input id="cd" type="number" defaultValue={7} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  toast.success("Credit recorded", { description: "Front-end demo only for now." });
                }}
              >
                Save to ledger
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total outstanding" value={KES(total)} icon={BookOpen} tone="gold" />
        <StatCard label="Customers on credit" value={String(debts.length)} />
        <StatCard
          label="Overdue"
          value={KES(overdue.reduce((s, d) => s + d.amount, 0))}
          icon={TriangleAlert}
          tone="danger"
          hint={`${overdue.length} customers`}
        />
        <StatCard label="Recovered this month" value={KES(9400)} delta={22} />
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search customer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Reminders queued", {
                description: `WhatsApp reminders prepared for ${overdue.length} overdue customers.`,
              })
            }
          >
            <MessageCircle className="mr-2 size-4" /> Remind all overdue
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Taken</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last reminder</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{d.phone}</TableCell>
                  <TableCell className="text-right font-semibold">{KES(d.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{d.taken}</TableCell>
                  <TableCell className="text-muted-foreground">{d.due}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "Overdue"
                          ? "destructive"
                          : d.status === "Due soon"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.lastReminder}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toast.success("Reminder sent", {
                          description: `WhatsApp reminder queued for ${d.customer}.`,
                        })
                      }
                    >
                      Remind
                    </Button>
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
