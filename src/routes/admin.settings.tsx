import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Platform settings — InuaBiz admin" }],
  }),
  component: AdminSettings,
});

const OPERATORS = [
  { name: "Zachariah Komu", role: "Super admin", phone: "0700 000 001", email: "zack@inuabiz.co.ke" },
  { name: "Mercy K.", role: "Operator", phone: "0712 000 010", email: "mercy@inuabiz.co.ke" },
  { name: "James O.", role: "Support", phone: "0708 441 220", email: "james@inuabiz.co.ke" },
];

function AdminSettings() {
  const identity = useIdentity("admin");
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const shop = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const compliance = pricing?.compliance ?? COMPLIANCE_PRICE;
  const setup = pricing?.setup ?? 1000;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;

  const save = (label: string) =>
    toast.info(`${label} not persisted here`, {
      description: "Edit plan amounts on Plans & pricing. Rails and operators are not saved from this form yet.",
    });

  return (
    <AdminShell
      title="Platform settings"
      description="Command centre, plan, billing rails and operators"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge>{roleLabel(identity.role)}</RoleBadge>
          <Button size="sm" variant="ink" className="rounded-[10px]" onClick={() => save("Settings")}>
            Save changes
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
              <Input id="cc" defaultValue="InuaBiz Command Center" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op" className="text-muted-foreground text-xs">
                Lead operator
              </Label>
              <Input id="op" defaultValue={identity.fullName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-muted-foreground text-xs">
                Location
              </Label>
              <Input id="loc" defaultValue="Nairobi, Kenya" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sph" className="text-muted-foreground text-xs">
                Support phone
              </Label>
              <Input id="sph" defaultValue={identity.phone} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save("Profile")}>Save changes</Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Plan"
          description="Live amounts come from Plans & pricing. SHOP_MONTHLY drives STK and extra shops."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-muted-foreground text-xs">
                Standard / shop (KES)
              </Label>
              <Input id="price" type="number" value={shop} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial" className="text-muted-foreground text-xs">
                Trial length (days)
              </Label>
              <Input id="trial" type="number" value={trialDays} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp" className="text-muted-foreground text-xs">
                Compliance ETR / shop (KES)
              </Label>
              <Input id="comp" type="number" value={compliance} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup" className="text-muted-foreground text-xs">
                Assisted setup (KES)
              </Label>
              <Input id="setup" type="number" value={setup} readOnly />
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
            <Switch defaultChecked />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/plans">Edit plans</Link>
            </Button>
            <Button onClick={() => save("Plan")}>Save plan</Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Billing rails"
          description="Self-serve shop billing is Daraja STK. Paybill and shortcode live in edge-function secrets — this form does not write them."
        >
          <div className="bg-muted/60 space-y-4 rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary grid size-7 place-items-center rounded-lg">
                  <Smartphone className="text-primary-foreground size-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Daraja · M-Pesa STK</p>
                  <p className="text-primary text-xs">Live rail for subscriptions and extra shops</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Disconnect is owner-gated in production.")}
              >
                Disconnect
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="paybill" className="text-muted-foreground text-xs">
                  Subscription Paybill
                </Label>
                <Input id="paybill" defaultValue="(edge secret)" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-phone" className="text-muted-foreground text-xs">
                  STK billing phone
                </Label>
                <Input id="bill-phone" defaultValue={identity.phone} readOnly />
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Operators"
          description="Sample roster for this screen. Invites and edits are not written to the database yet."
          action={
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary"
              onClick={() => toast.info("Invite an operator by email")}
            >
              + Invite operator
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {OPERATORS.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-[11px] font-bold",
                      s.role === "Super admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initials(s.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {s.phone} · {s.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.role === "Super admin" ? (
                    <Badge>{s.role}</Badge>
                  ) : (
                    <Badge variant="outline">{s.role}</Badge>
                  )}
                  <button
                    type="button"
                    className="text-primary text-xs font-medium"
                    onClick={() => toast.info(`Edit ${s.name}`)}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard
          title="Security"
          description="Session lock, impersonation and PIN for this command centre."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Change operator PIN</p>
              <p className="text-muted-foreground text-xs">4-digit PIN before ghosting a vendor till</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("PIN update", { description: "Demo only — PIN is not stored." })}
            >
              Update
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Require reason on impersonation</p>
              <p className="text-muted-foreground text-xs">Logged to the support ledger every time</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Idle lock</p>
              <p className="text-muted-foreground text-xs">Lock this session after 15 minutes idle</p>
            </div>
            <Switch defaultChecked />
          </div>
        </SettingsCard>

        <SettingsCard
          title="Integrations"
          description="Keys live in .env. Mapbox is the GIS token. Vendor insights use generate-ai-insights."
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
              <span className="font-medium">Admin AI</span>
              <StatusPill status="Copilot + ledger" />
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
