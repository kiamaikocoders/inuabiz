import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  extendTrial,
  fetchOpsPulse,
  fetchTenantBilling,
  formatWhen,
  overrideSubscription,
  purgeTenant,
  setFeatureFlag,
} from "@/lib/admin-ops";
import { fetchSubscriptionPlans } from "@/lib/plans";
import { SUBSCRIPTION_PRICE, KES } from "@/lib/mock-data";

const STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"] as const;

export function TenantOpsCard({
  tenantId,
  business,
  onPurged,
}: {
  tenantId: string;
  business: string;
  onPurged: () => void;
}) {
  const qc = useQueryClient();
  const { data: billing } = useQuery({
    queryKey: ["tenant-billing", tenantId],
    queryFn: () => fetchTenantBilling(tenantId),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => fetchSubscriptionPlans({ includeInactive: true }),
  });
  const { data: pulse } = useQuery({
    queryKey: ["admin-ops-pulse"],
    queryFn: fetchOpsPulse,
  });

  const [days, setDays] = useState(7);
  const [trialReason, setTrialReason] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ACTIVE");
  const [periodDays, setPeriodDays] = useState("30");
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [purgeReason, setPurgeReason] = useState("");

  useEffect(() => {
    if (billing?.customUnitAmountKes != null) {
      setCustomUnit(String(billing.customUnitAmountKes));
    } else if (billing) {
      setCustomUnit("");
    }
  }, [billing?.customUnitAmountKes, billing]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tenant-billing", tenantId] });
    void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    void qc.invalidateQueries({ queryKey: ["admin-ops-pulse"] });
    void qc.invalidateQueries({ queryKey: ["tenant", tenantId] });
  };

  const extend = useMutation({
    mutationFn: () => extendTrial(tenantId, days, trialReason),
    onSuccess: () => {
      toast.success("Trial extended");
      setTrialReason("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const override = useMutation({
    mutationFn: () => {
      const trimmed = customUnit.trim();
      const unit = trimmed === "" ? null : Number(trimmed);
      if (trimmed !== "" && (!Number.isFinite(unit) || (unit as number) < 0)) {
        throw new Error("Enter a valid price per shop, or leave blank for the standard plan.");
      }
      return overrideSubscription({
        tenantId,
        amount: null,
        planCode: planCode || billing?.planCode || "SHOP_MONTHLY",
        status,
        periodDays: periodDays.trim() ? Number(periodDays) : null,
        reason: overrideReason,
        customUnitAmountKes: unit,
        setCustomUnit: true,
      });
    },
    onSuccess: () => {
      toast.success("Subscription updated");
      setOverrideReason("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const purge = useMutation({
    mutationFn: () => purgeTenant(tenantId, confirmName, purgeReason),
    onSuccess: () => {
      toast.success("Tenant purged");
      onPurged();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const flags = (pulse?.flags ?? []).filter((f) => !f.tenant_id || f.tenant_id === tenantId);
  const tenantOverrides = new Map(
    flags.filter((f) => f.tenant_id === tenantId).map((f) => [f.key, f.enabled]),
  );

  return (
    <div className="surface-card mt-4 space-y-6 p-4 sm:p-6">
      <div>
        <h3 className="font-semibold">Lifecycle overrides</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Every change writes an audit row. Trial ends {formatWhen(billing?.trialEndsAt)} · access{" "}
          {formatWhen(billing?.accessUntil)} · {billing?.planCode} ·{" "}
          {billing?.customUnitAmountKes != null
            ? `${KES(billing.customUnitAmountKes)}/shop custom`
            : "standard plan"}{" "}
          · total {billing?.amount != null ? KES(billing.amount) : "—"}
          {billing?.shopCount ? ` (${billing.shopCount} shop${billing.shopCount === 1 ? "" : "s"})` : ""}
          {billing?.autoDebit ? " · Ratiba on" : ""}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Extend trial</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="trial-days" className="text-xs">
                Days
              </Label>
              <Input
                id="trial-days"
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="trial-reason" className="text-xs">
              Reason
            </Label>
            <Textarea
              id="trial-reason"
              rows={2}
              value={trialReason}
              onChange={(e) => setTrialReason(e.target.value)}
              placeholder="Support exception, waiting on PayHero…"
            />
          </div>
          <Button
            size="sm"
            disabled={extend.isPending}
            onClick={() => extend.mutate()}
          >
            Grant extension
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Custom plan / status</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Price per shop (KES)</Label>
              <Input
                type="number"
                min={0}
                value={customUnit}
                placeholder={String(SUBSCRIPTION_PRICE)}
                onChange={(e) => setCustomUnit(e.target.value)}
              />
              <p className="text-muted-foreground text-[11px] leading-snug">
                Negotiated rate for this vendor. Blank = standard plan. Total = shops × this (e.g. 3 ×
                2,500 = 7,500).
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period (days)</Label>
              <Input
                type="number"
                min={1}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Plan</Label>
              <Select value={planCode || billing?.planCode || "FLAT_3000"} onValueChange={setPlanCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {(plans.length ? plans : [{ code: billing?.planCode ?? "FLAT_3000", name: "Current" }]).map(
                    (p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name ?? p.code}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            rows={2}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason for override"
          />
          <Button size="sm" disabled={override.isPending} onClick={() => override.mutate()}>
            Apply override
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Tenant flags</p>
        <ul className="mt-3 space-y-2">
          {(pulse?.flags ?? [])
            .filter((f) => !f.tenant_id)
            .map((flag) => {
              const on = tenantOverrides.get(flag.key) ?? flag.enabled;
              return (
                <li key={flag.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{flag.key}</span>
                  <Switch
                    checked={on}
                    onCheckedChange={(enabled) => {
                      void setFeatureFlag(flag.key, enabled, tenantId)
                        .then(() => {
                          toast.success(`${flag.key} ${enabled ? "on" : "off"} for this shop`);
                          invalidate();
                        })
                        .catch((err: Error) => toast.error(err.message));
                    }}
                    aria-label={`Toggle ${flag.key} for tenant`}
                  />
                </li>
              );
            })}
        </ul>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold">Hard delete (GDPR)</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Purges shops, sales, logos and auth users. Type the shop name <span className="font-semibold">{business}</span>{" "}
          to confirm.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="mt-3">
              Purge tenant
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {business} forever?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone from the app. PITR in Supabase is the only rollback.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="purge-name">Shop name</Label>
              <Input
                id="purge-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <Label htmlFor="purge-reason">Reason</Label>
              <Textarea
                id="purge-reason"
                rows={2}
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={purge.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  purge.mutate();
                }}
              >
                Purge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
