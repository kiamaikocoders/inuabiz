import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Check, CreditCard, Repeat, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS, paymentHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & billing — InuaBiz" },
      {
        name: "description",
        content:
          "Manage your KES 3,000 monthly InuaBiz subscription, pay by M-Pesa STK push and review every past invoice.",
      },
      { property: "og:title", content: "InuaBiz subscription" },
      { property: "og:description", content: "KES 3,000/month, billed by M-Pesa STK push." },
    ],
  }),
  component: Billing,
});

function Billing() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "waiting" | "done">("idle");
  const [autoDebit, setAutoDebit] = useState(false);
  const daysLeft = 3;

  const pay = () => {
    setState("waiting");
    setTimeout(() => {
      setState("done");
      toast.success("Subscription active", { description: "Access extended by 30 days." });
    }, 2200);
  };

  return (
    <AppShell title="Subscription" description="Your InuaBiz plan and payment history">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-hero-gradient relative overflow-hidden rounded-2xl p-6 shadow-lift lg:col-span-2">
          <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-gold text-xs font-semibold tracking-widest uppercase">
                  Current plan
                </p>
                <h2 className="text-primary-foreground mt-1 text-2xl font-bold">InuaBiz Complete</h2>
              </div>
              <Badge className="bg-gold text-gold-foreground border-transparent hover:bg-gold">
                Trial · {daysLeft} days left
              </Badge>
            </div>

            <p className="text-primary-foreground mt-6 font-display text-4xl font-bold">
              {KES(SUBSCRIPTION_PRICE)}
              <span className="text-primary-foreground/60 text-base font-medium"> /month</span>
            </p>

            <div className="mt-5">
              <div className="text-primary-foreground/70 flex justify-between text-xs">
                <span>Trial progress</span>
                <span>
                  {TRIAL_DAYS - daysLeft} of {TRIAL_DAYS} days used
                </span>
              </div>
              <Progress value={((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100} className="mt-2 h-1.5" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setState("idle");
                  setOpen(true);
                }}
              >
                <Smartphone className="mr-2 size-4" /> Pay {KES(SUBSCRIPTION_PRICE)} by M-Pesa
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() =>
                  toast.info("Card payment", { description: "Card checkout via IntaSend." })
                }
              >
                <CreditCard className="mr-2 size-4" /> Pay by card
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="inline-flex items-center gap-2 font-semibold">
              <Repeat className="text-primary size-4" /> Auto-debit (M-Pesa Ratiba)
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Authorise a monthly standing order once and renewals happen without any prompt. Up to 3
              automatic retries over 72 hours if funds are short.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Label htmlFor="ratiba" className="text-sm">
                Enable auto-debit
              </Label>
              <Switch
                id="ratiba"
                checked={autoDebit}
                onCheckedChange={(v) => {
                  setAutoDebit(v);
                  toast.info(v ? "Ratiba opt-in prompt sent" : "Auto-debit disabled");
                }}
              />
            </div>
            <Badge variant="outline" className="mt-3">
              Phase 2 feature
            </Badge>
          </div>

          <div className="surface-card p-5">
            <p className="inline-flex items-center gap-2 font-semibold">
              <CalendarClock className="text-primary size-4" /> Next billing date
            </p>
            <p className="mt-2 font-display text-xl font-bold">19 Aug 2026</p>
            <p className="text-muted-foreground mt-1 text-sm">
              STK prompt will be sent to 0722 431 002.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">Payment history</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.invoice}</TableCell>
                  <TableCell className="text-muted-foreground">{p.date}</TableCell>
                  <TableCell className="text-right font-semibold">{KES(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.channel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "COMPLETE" ? "secondary" : "destructive"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {KES(SUBSCRIPTION_PRICE)} subscription</DialogTitle>
            <DialogDescription>
              An M-Pesa prompt will appear on your phone. Enter your PIN to renew for 30 days.
            </DialogDescription>
          </DialogHeader>

          {state === "idle" && (
            <div className="space-y-2">
              <Label htmlFor="mp">M-Pesa number</Label>
              <Input id="mp" defaultValue="0722 431 002" />
            </div>
          )}

          {state === "waiting" && (
            <div className="py-6 text-center">
              <span className="bg-primary-soft text-primary mx-auto grid size-14 animate-pulse place-items-center rounded-2xl">
                <Smartphone className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">Check your phone</p>
              <p className="text-muted-foreground mt-1 text-xs">
                "Pay KES 3,000 to InuaBiz Services?"
              </p>
            </div>
          )}

          {state === "done" && (
            <div className="py-6 text-center">
              <span className="bg-success/15 text-success mx-auto grid size-14 place-items-center rounded-2xl">
                <Check className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">Subscription active</p>
              <p className="text-muted-foreground mt-1 text-xs">Next billing 16 Sep 2026.</p>
            </div>
          )}

          <DialogFooter>
            {state === "idle" && (
              <Button className="w-full" onClick={pay}>
                Send STK prompt
              </Button>
            )}
            {state === "waiting" && (
              <Button variant="outline" className="w-full" onClick={() => setState("idle")}>
                Cancel and retry
              </Button>
            )}
            {state === "done" && (
              <Button className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
