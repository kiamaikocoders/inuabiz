import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { RoleBadge, SettingsCard } from "@/components/app/SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/admin/StatusPill";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { COMPLIANCE_PRICE, KES, SUBSCRIPTION_PRICE, TRIAL_DAYS } from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import { initials, roleLabel, useIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import {
  fetchOperators,
  fetchPlatformSettings,
  inviteVendorEmail,
  savePlatformSettings,
} from "@/lib/platform-settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Platform settings — InuaBiz admin" }],
  }),
  component: AdminSettings,
});

const SETTING_KEYS = [
  "platform.command_centre_name",
  "platform.location",
  "platform.support_phone",
  "platform.allow_self_serve",
  "platform.idle_lock_minutes",
  "platform.impersonation_reason_required",
  "email.ops_inbox",
];

function AdminSettings() {
  const identity = useIdentity("admin");
  const queryClient = useQueryClient();
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const { data: settings } = useQuery({
    queryKey: ["platform-settings", SETTING_KEYS],
    queryFn: () => fetchPlatformSettings(SETTING_KEYS),
    enabled: isSupabaseConfigured(),
  });
  const { data: operators = [] } = useQuery({
    queryKey: ["platform-operators"],
    queryFn: fetchOperators,
    enabled: isSupabaseConfigured(),
  });

  const shop = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const compliance = pricing?.compliance ?? COMPLIANCE_PRICE;
  const setup = pricing?.setup ?? 1000;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;

  const [ccName, setCcName] = useState("InuaBiz Command Center");
  const [location, setLocation] = useState("Nairobi, Kenya");
  const [supportPhone, setSupportPhone] = useState("");
  const [opsInbox, setOpsInbox] = useState("hello@inuabiz.co.ke");
  const [allowSelfServe, setAllowSelfServe] = useState(true);
  const [requireImpersonationReason, setRequireImpersonationReason] = useState(true);
  const [idleLock, setIdleLock] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (settings["platform.command_centre_name"]) {
      setCcName(settings["platform.command_centre_name"]!);
    }
    if (settings["platform.location"]) setLocation(settings["platform.location"]!);
    if (settings["platform.support_phone"]) {
      setSupportPhone(settings["platform.support_phone"]!);
    }
    if (settings["email.ops_inbox"]) setOpsInbox(settings["email.ops_inbox"]!);
    if (settings["platform.allow_self_serve"] != null) {
      setAllowSelfServe(settings["platform.allow_self_serve"] !== "false");
    }
    if (settings["platform.impersonation_reason_required"] != null) {
      setRequireImpersonationReason(
        settings["platform.impersonation_reason_required"] !== "false",
      );
    }
    if (settings["platform.idle_lock_minutes"] != null) {
      setIdleLock(Number(settings["platform.idle_lock_minutes"]) > 0);
    }
  }, [settings]);

  const persist = async () => {
    setSaving(true);
    try {
      await savePlatformSettings({
        "platform.command_centre_name": ccName.trim() || "InuaBiz Command Center",
        "platform.location": location.trim() || "Nairobi, Kenya",
        "platform.support_phone": supportPhone.trim(),
        "email.ops_inbox": opsInbox.trim() || "hello@inuabiz.co.ke",
        "platform.allow_self_serve": allowSelfServe,
        "platform.impersonation_reason_required": requireImpersonationReason,
        "platform.idle_lock_minutes": idleLock ? 30 : 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Platform settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async () => {
    const to = inviteEmail.trim().toLowerCase();
    if (!to.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      await inviteVendorEmail(to);
      toast.success("Invite sent", { description: to });
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    }
  };

  return (
    <AdminShell
      title="Platform settings"
      description="Command centre, plan, billing rails and operators"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge>{roleLabel(identity.role)}</RoleBadge>
          <Button
            size="sm"
            variant="ink"
            className="rounded-[10px]"
            disabled={saving || !isSupabaseConfigured()}
            onClick={() => void persist()}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground mb-4 max-w-3xl text-sm">
        These are platform defaults.{" "}
        <Link
          to="/admin/profile"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Edit your operator profile
        </Link>
        .
      </p>

      <div className="grid max-w-5xl gap-5">
        <SettingsCard
          title="Platform profile"
          description="Public identity of the InuaBiz command centre."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cc" className="text-muted-foreground text-xs">
                Command centre name
              </Label>
              <Input id="cc" value={ccName} onChange={(e) => setCcName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op" className="text-muted-foreground text-xs">
                Lead operator
              </Label>
              <Input id="op" value={identity.fullName} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-muted-foreground text-xs">
                Location
              </Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sph" className="text-muted-foreground text-xs">
                Support phone
              </Label>
              <Input
                id="sph"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="07xx xxx xxx"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ops" className="text-muted-foreground text-xs">
                Ops inbox (support + contact)
              </Label>
              <Input
                id="ops"
                type="email"
                value={opsInbox}
                onChange={(e) => setOpsInbox(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={() => void persist()}>
              Save changes
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Plan"
          description="Live amounts come from Plans & pricing. SHOP_MONTHLY drives PayHero subscription STK and extra shops."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Standard / shop (KES)</Label>
              <Input type="number" value={shop} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Trial length (days)</Label>
              <Input type="number" value={trialDays} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Compliance ETR / shop (KES)</Label>
              <Input type="number" value={compliance} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Assisted setup (KES)</Label>
              <Input type="number" value={setup} readOnly />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Current Standard: {KES(shop)} · Compliance: {KES(compliance)} · Setup: {KES(setup)}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Allow self-serve onboarding</p>
              <p className="text-muted-foreground text-xs">
                Email + password + OTP, then shop setup. First shop is the {trialDays}-day trial.
              </p>
            </div>
            <Switch checked={allowSelfServe} onCheckedChange={setAllowSelfServe} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/plans">Edit plans</Link>
            </Button>
            <Button disabled={saving} onClick={() => void persist()}>
              Save plan flags
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Billing rails"
          description="Self-serve shop billing is PayHero STK. Channel secrets live in Supabase Edge — not on this form."
        >
          <div className="bg-muted/60 space-y-4 rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary grid size-7 place-items-center rounded-lg">
                  <Smartphone className="text-primary-foreground size-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">PayHero · M-Pesa STK</p>
                  <p className="text-primary text-xs">Live rail for subscriptions and extra shops</p>
                </div>
              </div>
              <StatusPill status="Configured in secrets" />
            </div>
            <p className="text-muted-foreground text-xs">
              Set <code className="text-foreground">PAYHERO_AUTH_TOKEN</code>,{" "}
              <code className="text-foreground">PAYHERO_CHANNEL_ID</code>, and{" "}
              <code className="text-foreground">PAYHERO_WEBHOOK_SECRET</code> in Edge secrets. Append{" "}
              <code className="text-foreground">?secret=…</code> to the PayHero callback URL.
            </p>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Operators"
          description="Live SUPER_ADMIN profiles. Invite a vendor by email to the public signup link."
        >
          <ul className="divide-y divide-border">
            {operators.length === 0 ? (
              <li className="text-muted-foreground py-3 text-sm">
                {isSupabaseConfigured()
                  ? "No super-admin profiles found."
                  : "Connect Supabase to load operators."}
              </li>
            ) : (
              operators.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "bg-primary text-primary-foreground grid size-8 place-items-center rounded-full text-[11px] font-bold",
                      )}
                    >
                      {initials(s.full_name || "Admin")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.full_name || "Operator"}</p>
                      <p className="text-muted-foreground text-xs">
                        {[s.phone, s.id.slice(0, 8)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Badge>Super admin</Badge>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="vendor@shop.co.ke"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button type="button" onClick={() => void sendInvite()}>
              Invite vendor
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Security"
          description="Session lock and impersonation policy for this command centre."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Require reason on impersonation</p>
              <p className="text-muted-foreground text-xs">Logged to the support ledger every time</p>
            </div>
            <Switch
              checked={requireImpersonationReason}
              onCheckedChange={setRequireImpersonationReason}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Idle lock</p>
              <p className="text-muted-foreground text-xs">
                Prefer locking this session after 30 minutes idle
              </p>
            </div>
            <Switch checked={idleLock} onCheckedChange={setIdleLock} />
          </div>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={() => void persist()}>
              Save security
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Integrations"
          description="Keys live in .env / Edge secrets. Mapbox is the GIS token."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Supabase</span>
              <StatusPill status={isSupabaseConfigured() ? "Connected" : "Not configured"} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Mapbox GIS</span>
              <StatusPill status={MAPBOX_TOKEN ? "Token present" : "Missing token"} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Email / communications</span>
              <Link to="/admin/communications" className="text-primary text-sm font-medium">
                Open hub
              </Link>
            </div>
          </div>
        </SettingsCard>
      </div>
    </AdminShell>
  );
}
