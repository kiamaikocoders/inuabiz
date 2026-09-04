import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { KES } from "@/lib/mock-data";
import { fetchCreditBook, recordCredit, remindCredit } from "@/lib/data";

export const Route = createFileRoute("/app/credit")({
  head: () => ({
    meta: [
      { title: "Duka debt ledger — InuaBiz" },
      {
        name: "description",
        content:
          "Digitise kukopesha: record customer credit in two taps, track balances and due dates, and send automated reminders.",
      },
    ],
  }),
  component: Credit,
});

function Credit() {
  const queryClient = useQueryClient();
  const { data: live = [] } = useQuery({
    queryKey: ["credit-book"],
    queryFn: fetchCreditBook,
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [nameOrPhone, setNameOrPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDays, setDueDays] = useState("7");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () => live.filter((d) => d.customer.toLowerCase().includes(q.toLowerCase()) || d.phone.includes(q)),
    [live, q],
  );
  const total = rows.reduce((s, d) => s + d.amount, 0);
  const overdue = rows.filter((d) => d.status === "Overdue");

  const save = async () => {
    const kes = Number(amount);
    if (!nameOrPhone.trim() || !(kes > 0)) {
      toast.error("Customer and amount are required");
      return;
    }
    setBusy(true);
    try {
      await recordCredit({
        nameOrPhone: nameOrPhone.trim(),
        amount: kes,
        dueDays: Number(dueDays) || 7,
      });
      toast.success("Credit recorded");
      setOpen(false);
      setNameOrPhone("");
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["credit-book"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-customers"] });
    } catch (err) {
      toast.error("Could not record", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const remind = async (row: (typeof rows)[0]) => {
    try {
      await remindCredit(row);
      toast.success("Reminder sent", {
        description: `Email nudge queued for your inbox about ${row.customer}.`,
      });
    } catch (err) {
      toast.error("Could not send reminder", {
        description: err instanceof Error ? err.message : "Check email settings",
      });
    }
  };

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
                <Input
                  id="cn"
                  placeholder="0722 431 002"
                  value={nameOrPhone}
                  onChange={(e) => setNameOrPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ca">Amount</Label>
                  <Input
                    id="ca"
                    type="number"
                    placeholder="1200"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cd">Due in (days)</Label>
                  <Input
                    id="cd"
                    type="number"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" disabled={busy} onClick={() => void save()}>
                Save to ledger
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total outstanding" value={KES(total)} icon={BookOpen} tone="gold" />
        <StatCard label="Customers on credit" value={String(rows.length)} />
        <StatCard
          label="Overdue"
          value={KES(overdue.reduce((s, d) => s + d.amount, 0))}
          icon={TriangleAlert}
          tone="danger"
          hint={`${overdue.length} customers`}
        />
        <StatCard label="Reminders" value="Email" />
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
            onClick={() => {
              void Promise.all(overdue.map((d) => remindCredit(d)))
                .then(() =>
                  toast.success("Reminders queued", {
                    description: `Email nudges for ${overdue.length} overdue balances (to your inbox).`,
                  }),
                )
                .catch((err: unknown) =>
                  toast.error("Could not queue all reminders", {
                    description: err instanceof Error ? err.message : "Try one at a time",
                  }),
                );
            }}
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
                    <Button variant="ghost" size="sm" onClick={() => void remind(d)}>
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
