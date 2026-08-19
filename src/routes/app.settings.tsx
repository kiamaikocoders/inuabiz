import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { RoleBadge, SettingsCard } from "@/components/app/SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEMO_VENDOR,
  initials,
  isVendorOwner,
  persistIdentity,
  roleLabel,
  useIdentity,
} from "@/lib/identity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — InuaBiz" },
      {
        name: "description",
        content:
          "Manage your business profile, M-Pesa payment channels, staff access and receipt preferences.",
      },
      { property: "og:title", content: "InuaBiz settings" },
      { property: "og:description", content: "Business profile, payment channels and staff access." },
    ],
  }),
  component: SettingsPage,
});

const STAFF = [
  { name: "Mama Njoroge", role: "Owner", phone: "0722 431 002" },
  { name: "Kevin M.", role: "Attendant", phone: "0711 220 118" },
  { name: "Faith A.", role: "Attendant", phone: "0745 991 002" },
];

function SettingsPage() {
  const identity = useIdentity("vendor");
  const owner = isVendorOwner(identity.role);
  const save = () => toast.success("Settings saved", { description: "Front-end demo only for now." });

  const previewAttendant = () => {
    persistIdentity("vendor", {
      role: "ATTENDANT",
      fullName: "Kevin M.",
      phone: "0711 220 118",
    });
    toast.message("Attendant view", { description: "Shop, till and staff are locked." });
  };

  const restoreOwner = () => {
    persistIdentity("vendor", {
      role: DEMO_VENDOR.role,
      fullName: DEMO_VENDOR.fullName,
      phone: DEMO_VENDOR.phone,
    });
    toast.success("Owner view restored");
  };

  return (
    <AppShell
      title="Settings"
      description="Business profile, payments and staff"
      actions={
        <div className="hidden items-center gap-2 sm:flex">
          <RoleBadge>{roleLabel(identity.role)}</RoleBadge>
          {owner ? (
            <Button size="sm" variant="outline" onClick={previewAttendant}>
              Preview attendant
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={restoreOwner}>
              Back to owner
            </Button>
          )}
        </div>
      }
    >
      <p className="text-muted-foreground mb-4 max-w-3xl text-sm">
        These are shop settings.{" "}
        <Link to="/app/profile" className="text-primary font-medium underline-offset-4 hover:underline">
          Edit your personal profile
        </Link>
        .
      </p>

      <div className="grid max-w-5xl gap-5">
        <SettingsCard
          title="Business Profile"
          description={
            owner
              ? "Manage your shop's public information."
              : "Locked. Only the owner can change shop details."
          }
          locked={!owner}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bn" className="text-muted-foreground text-xs">
                Shop Name
              </Label>
              <Input id="bn" defaultValue="Njoroge Mini Mart" disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat" className="text-muted-foreground text-xs">
                Business Category
              </Label>
              <Select defaultValue="duka" disabled={!owner}>
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duka">Duka</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="chemist">Chemist</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="eatery">Eatery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-muted-foreground text-xs">
                Location
              </Label>
              <Input id="loc" defaultValue="Kasarani, Nairobi" disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph" className="text-muted-foreground text-xs">
                Contact Phone
              </Label>
              <Input id="ph" defaultValue="0722 431 002" disabled={!owner} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={!owner}>
              {owner ? "Save changes" : "Owner only"}
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Payment Settings"
          description={
            owner
              ? "Money from sales lands in these channels. All of them reconcile automatically."
              : "Locked. Till and Paybill are owner-only."
          }
          locked={!owner}
        >
          <div className="bg-muted/60 space-y-4 rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary grid size-7 place-items-center rounded-lg">
                  <Smartphone className="text-primary-foreground size-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">M-Pesa Integration</p>
                  <p className="text-primary text-xs">Status: Connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled={!owner}>
                {owner ? "Disconnect" : "Owner only"}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="till" className="text-muted-foreground text-xs">
                  Buy Goods Till
                </Label>
                <Input id="till" defaultValue="889 201" disabled={!owner} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mpesa" className="text-muted-foreground text-xs">
                  Personal M-Pesa
                </Label>
                <Input id="mpesa" defaultValue="0722 431 002" disabled={!owner} />
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Staff Management"
          description={
            owner
              ? "Attendants can sell but cannot see margins, insights or settings."
              : "Locked. You cannot invite staff or change roles."
          }
          locked={!owner}
          action={
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary"
              disabled={!owner}
              onClick={() => toast.info("Invite staff by phone number")}
            >
              {owner ? "+ Invite an attendant" : "Owner only"}
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {STAFF.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-[11px] font-bold",
                      s.role === "Owner"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initials(s.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-muted-foreground text-xs">{s.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.role === "Owner" ? (
                    <Badge>{s.role}</Badge>
                  ) : (
                    <Badge variant="outline">{s.role}</Badge>
                  )}
                  {owner ? (
                    <button
                      type="button"
                      className="text-primary text-xs font-medium"
                      onClick={() => toast.info(`Edit ${s.name}`)}
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard title="Security" description="Secure the till and this handset.">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Change PIN</p>
              <p className="text-muted-foreground text-xs">Update your 4-digit access PIN</p>
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
              <p className="text-sm font-semibold">Biometric unlock</p>
              <p className="text-muted-foreground text-xs">
                Use fingerprint or Face ID on this handset
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </SettingsCard>

        {owner && (
          <SettingsCard
            title="Receipts"
            description="Footer copy and how digital receipts leave the till."
          >
            <div className="space-y-1.5">
              <Label htmlFor="rf" className="text-muted-foreground text-xs">
                Receipt footer message
              </Label>
              <Input id="rf" defaultValue="Asante sana! Karibu tena." />
            </div>
            {[
              ["Send SMS receipt", "Costs are covered by your subscription", true],
              ["Send email receipt", "When the customer has an email on file", false],
              ["Show margins on receipt", "Never share this with customers", false],
            ].map(([l, h, on]) => (
              <div key={l as string} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{l as string}</p>
                  <p className="text-muted-foreground text-xs">{h as string}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={save}>Save receipt settings</Button>
            </div>
          </SettingsCard>
        )}
      </div>
    </AppShell>
  );
}
