import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { KES, SUBSCRIPTION_PRICE, TRIAL_DAYS, paymentHistory as mockHistory } from "@/lib/mock-data";
import { prettyKePhone } from "@/lib/phone";
import { invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchBillingSnapshot,
  fetchPaymentHistory,
  pollSubscriptionPayment,
} from "@/lib/payments";

export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & billing — InuaBiz" },
      {
        name: "description",
        content:
          "Manage your InuaBiz subscription, pay by M-Pesa STK push and review every past invoice.",
      },
    ],
  }),
  component: Billing,
});

function daysBetween(fromIso: string | null, toIso: string | null | undefined): number {
  if (!fromIso || !toIso) return TRIAL_DAYS;
  const ms = new Date(toIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function Billing() {
  const queryClient = useQueryClient();
  const { data: snap } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingSnapshot,
  });
  const { data: history = isSupabaseConfigured() ? [] : mockHistory } = useQuery({
    queryKey: ["payment-history"],
    queryFn: fetchPaymentHistory,
  });

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "waiting" | "done" | "failed">("idle");
  const [busy, setBusy] = useState(false);

  const amount = snap?.amount ?? SUBSCRIPTION_PRICE;
  const daysLeft = daysBetween(null, snap?.trialEndsAt ?? snap?.accessUntil);
  const used = Math.min(TRIAL_DAYS, TRIAL_DAYS - daysLeft);
  const statusLabel =
    snap?.status === "ACTIVE"
      ? "Active"
      : snap?.status === "PAST_DUE"
        ? "Past due"
        : `Trial · ${daysLeft} days left`;

  const rows = useMemo(
    () =>
      history.length || isSupabaseConfigured()
        ? history
        : mockHistory.map((p) => ({
            id: p.id,
            invoice: p.invoice,
            date: p.date,
            amount: p.amount,
            channel: p.channel,
            status: p.status,
          })),
    [history],
  );

  const pay = async () => {
    setBusy(true);
    setState("waiting");
    const { data, error } = await invokeFunction<{
      ok?: boolean;
      checkout_request_id?: string;
      transaction?: { invoice_id?: string };
      message?: string;
    }>("create-subscription-charge", { phone: phone || snap?.phone });
    if (error || !data?.ok) {
      setState("failed");
      setBusy(false);
      toast.error("STK failed", { description: error ?? "Could not send the M-Pesa prompt." });
      return;
    }
    const invoiceId = data.transaction?.invoice_id ?? data.checkout_request_id;
    if (!invoiceId) {
      setState("done");
      setBusy(false);
      toast.success("Prompt sent", { description: data.message });
      return;
    }
    const result = await pollSubscriptionPayment(invoiceId);
    setBusy(false);
    if (result === "COMPLETE") {
      setState("done");
      toast.success("Subscription active", { description: "Access extended by 30 days." });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-history"] });
    } else if (result === "FAILED") {
      setState("failed");
      toast.error("Payment failed", { description: "PIN cancelled or timed out. Try again." });
    } else {
      setState("waiting");
      toast.info("Still waiting", {
        description: "Enter PIN on the phone. PayHero will confirm within a few seconds.",
      });
    }
  };

  const toggleRatiba = async (enabled: boolean) => {
    if (!enabled) {
      toast.info("Auto-debit stays on until the standing order is cancelled in M-Pesa.");
      return;
    }
    const { data, error } = await invokeFunction<{
      ok?: boolean;
      message?: string;
      already_enabled?: boolean;
    }>("create-ratiba-standing-order", { phone: phone || snap?.phone });
    if (error || !data?.ok) {
      toast.error("Ratiba opt-in failed", { description: error ?? "Safaricom rejected the request." });
      return;
    }
    toast.success(data.already_enabled ? "Auto-debit already active" : "Check your phone", {
      description: data.message ?? "Enter PIN to authorise the monthly standing order.",
    });
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
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
                <h2 className="text-primary-foreground mt-1 text-2xl font-bold">
                  {snap?.planName ?? "Standard"}
                </h2>
              </div>
              <Badge className="bg-gold text-gold-foreground border-transparent hover:bg-gold">
                {statusLabel}
              </Badge>
            </div>

            <p className="text-primary-foreground mt-6 font-display text-4xl font-bold">
              {KES(amount)}
              <span className="text-primary-foreground/60 text-base font-medium"> /month</span>
            </p>

            <div className="mt-5">
              <div className="text-primary-foreground/70 flex justify-between text-xs">
                <span>Trial progress</span>
                <span>
                  {used} of {TRIAL_DAYS} days used
                </span>
              </div>
              <Progress value={(used / TRIAL_DAYS) * 100} className="mt-2 h-1.5" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setState("idle");
                  setPhone(snap?.phone ? prettyKePhone(snap.phone) : "");
                  setOpen(true);
                }}
              >
                <Smartphone className="mr-2 size-4" /> Pay {KES(amount)} by M-Pesa
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() =>
                  toast.info("Card payment", {
                    description: "Card checkout is coming soon. M-Pesa via PayHero is the live rail.",
                  })
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
              Authorise a monthly standing order once. Renewals happen without a new prompt. Up to 3
              automatic retries over 72 hours if funds are short.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Label htmlFor="ratiba" className="text-sm">
                Enable auto-debit
              </Label>
              <Switch
                id="ratiba"
                checked={Boolean(snap?.autoDebit)}
                onCheckedChange={(v) => void toggleRatiba(v)}
              />
            </div>
            {snap?.autoDebit && (
              <Badge variant="secondary" className="mt-3">
                Standing order active
              </Badge>
            )}
          </div>

          <div className="surface-card p-5">
            <p className="inline-flex items-center gap-2 font-semibold">
              <CalendarClock className="text-primary size-4" /> Next billing date
            </p>
            <p className="mt-2 font-display text-xl font-bold">
              {snap?.nextBillingDate
                ? new Date(snap.nextBillingDate).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              STK via PayHero will be sent to{" "}
              {snap?.phone ? prettyKePhone(snap.phone) : "your registered line"}.
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
              {rows.map((p) => (
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
            <DialogTitle>Pay {KES(amount)} subscription</DialogTitle>
            <DialogDescription>
              An M-Pesa prompt will appear on your phone. Enter your PIN to renew for 30 days.
            </DialogDescription>
          </DialogHeader>

          {state === "idle" && (
            <div className="space-y-2">
              <Label htmlFor="mp">M-Pesa number</Label>
              <Input id="mp" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}

          {state === "waiting" && (
            <div className="py-6 text-center">
              <span className="bg-primary-soft text-primary mx-auto grid size-14 animate-pulse place-items-center rounded-2xl">
                <Smartphone className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">Check your phone</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Pay {KES(amount)} to InuaBiz. Waiting for PayHero confirmation…
              </p>
            </div>
          )}

          {state === "done" && (
            <div className="py-6 text-center">
              <span className="bg-success/15 text-success mx-auto grid size-14 place-items-center rounded-2xl">
                <Check className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">Subscription active</p>
              <p className="text-muted-foreground mt-1 text-xs">Access extended by 30 days.</p>
            </div>
          )}

          {state === "failed" && (
            <p className="text-destructive text-sm">Payment did not complete. Try again.</p>
          )}

          <DialogFooter>
            {(state === "idle" || state === "failed") && (
              <Button className="w-full" disabled={busy} onClick={() => void pay()}>
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
