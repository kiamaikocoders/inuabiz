import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES } from "@/lib/mock-data";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchPublicPricing,
  fetchSubscriptionPlans,
  plansLive,
  saveTrialDays,
  updateSubscriptionPlan,
  type PlanInterval,
  type PlanUpsertInput,
  type SubscriptionPlan,
} from "@/lib/plans";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({
    meta: [
      { title: "Plans & pricing — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Create and edit InuaBiz subscription plans. SHOP_MONTHLY drives STK charges and extra-shop fees.",
      },
    ],
  }),
  component: AdminPlans,
});

const emptyForm = (): PlanUpsertInput => ({
  code: "",
  name: "",
  description: "",
  amountKes: 3000,
  billingInterval: "month",
  isActive: true,
  isPublic: true,
  displayOrder: 100,
});

function intervalLabel(v: PlanInterval) {
  if (v === "one_time") return "One-time";
  if (v === "quote") return "Quote";
  return "Monthly";
}

function AdminPlans() {
  const live = plansLive();
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: () => fetchSubscriptionPlans({ includeInactive: true }),
  });
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanUpsertInput>(emptyForm);
  const [trialDays, setTrialDays] = useState<number | null>(null);

  const trialValue = trialDays ?? pricing?.trialDays ?? 3;

  const shopPlan = useMemo(
    () => plans.find((p) => p.code === "SHOP_MONTHLY"),
    [plans],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.code.trim()) {
        throw new Error("Name and code are required");
      }
      if (editing) {
        return updateSubscriptionPlan(editing.id, form);
      }
      return createSubscriptionPlan(form);
    },
    onSuccess: () => {
      toast.success(editing ? "Plan updated" : "Plan created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      void qc.invalidateQueries({ queryKey: ["public-pricing"] });
      void qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const trialMutation = useMutation({
    mutationFn: () => saveTrialDays(trialValue),
    onSuccess: () => {
      toast.success("Trial length saved");
      void qc.invalidateQueries({ queryKey: ["public-pricing"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubscriptionPlan(id),
    onSuccess: () => {
      toast.success("Plan deleted");
      void qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      void qc.invalidateQueries({ queryKey: ["public-pricing"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      amountKes: plan.amountKes,
      billingInterval: plan.billingInterval,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      displayOrder: plan.displayOrder,
    });
    setOpen(true);
  };

  return (
    <AdminShell
      title="Plans & pricing"
      description="Amounts charged on STK and shown on /pricing — not hardcoded"
      actions={
        <Button size="sm" className="rounded-[10px]" onClick={openCreate} disabled={!live}>
          <Plus className="mr-1.5 size-4" />
          New plan
        </Button>
      }
    >
      {!live ? (
        <p className="text-muted-foreground mb-4 text-sm">
          Supabase is offline — showing local defaults. Connect the project to edit live plans.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shop / month"
          value={KES(shopPlan?.amountKes ?? pricing?.shopMonthly ?? 3000)}
          icon={CreditCard}
        />
        <StatCard
          label="Compliance"
          value={KES(pricing?.compliance ?? 4500)}
          icon={CreditCard}
          tone="violet"
        />
        <StatCard
          label="Assisted setup"
          value={KES(pricing?.setup ?? 1000)}
          icon={CreditCard}
          tone="gold"
        />
        <StatCard label="Trial days" value={String(trialValue)} icon={CreditCard} />
      </div>

      <div className="border-border bg-card mt-5 rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Trial length</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              First shop self-serve trial. Stored in platform settings.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="trial" className="text-muted-foreground text-xs">
                Days
              </Label>
              <Input
                id="trial"
                type="number"
                min={1}
                max={90}
                className="w-24"
                value={trialValue}
                onChange={(e) => setTrialDays(Number(e.target.value) || 1)}
                disabled={!live}
              />
            </div>
            <Button
              size="sm"
              variant="ink"
              className="rounded-[10px]"
              disabled={!live || trialMutation.isPending}
              onClick={() => trialMutation.mutate()}
            >
              Save trial
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Changing <code className="text-foreground">SHOP_MONTHLY</code> updates live STK amounts
          and all tenant subscription totals. See also{" "}
          <Link to="/admin/subscriptions" className="text-primary underline-offset-4 hover:underline">
            Subscriptions &amp; MRR
          </Link>
          .
        </p>
      </div>

      <div className="border-border bg-card mt-5 overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  Loading plans…
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  No plans yet. Create SHOP_MONTHLY first.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-muted-foreground max-w-xs truncate text-xs">
                      {plan.description || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{plan.code}</code>
                  </TableCell>
                  <TableCell className="font-semibold">{KES(plan.amountKes)}</TableCell>
                  <TableCell>{intervalLabel(plan.billingInterval)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.isActive ? (
                        <Badge className="bg-success/15 text-success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {plan.isPublic ? (
                        <Badge variant="outline">Public</Badge>
                      ) : (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                      {plan.code === "SHOP_MONTHLY" ? (
                        <Badge className="bg-primary/15 text-primary">Billing</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => openEdit(plan)}
                        disabled={!live}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive size-8"
                        disabled={!live || plan.code === "SHOP_MONTHLY" || deleteMutation.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete plan ${plan.code}? Public pricing will stop showing it.`,
                            )
                          ) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit plan" : "Create plan"}</DialogTitle>
            <DialogDescription>
              {editing?.code === "SHOP_MONTHLY"
                ? "This amount is used for monthly STK and extra-shop charges."
                : "Codes are uppercase identifiers used by billing and the marketing site."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Standard"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-code">Code</Label>
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SHOP_MONTHLY"
                disabled={editing?.code === "SHOP_MONTHLY"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-amount">Amount (KES)</Label>
              <Input
                id="plan-amount"
                type="number"
                min={0}
                step={1}
                value={form.amountKes}
                onChange={(e) => setForm({ ...form, amountKes: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select
                value={form.billingInterval}
                onValueChange={(v) =>
                  setForm({ ...form, billingInterval: v as PlanInterval })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-order">Display order</Label>
              <Input
                id="plan-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea
                id="plan-desc"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                id="plan-active"
              />
              <Label htmlFor="plan-active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isPublic}
                onCheckedChange={(checked) => setForm({ ...form, isPublic: checked })}
                id="plan-public"
              />
              <Label htmlFor="plan-public">Show on /pricing</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
