import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { ShopLogoPicker } from "@/components/app/ShopLogoPicker";
import { CompanionDeviceCard } from "@/components/app/CompanionDeviceCard";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials, isVendorOwner, roleLabel, useIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import { prettyKePhone } from "@/lib/phone";
import { useGhost } from "@/lib/ghost";
import {
  fetchShops,
  fetchStaff,
  fetchTenantHeader,
  inviteStaff,
  saveTenantHeader,
  EMAIL_RECEIPT_KEY,
  emailReceiptEnabled,
} from "@/lib/ops";
import { fetchPaymentDestinations, type PaymentDestination } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { uploadBusinessLogo } from "@/lib/business-logo";
import { CATEGORY_LIST, parseCategory, readDemoCategory } from "@/lib/category";

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

function SettingsPage() {
  const identity = useIdentity("vendor");
  const owner = isVendorOwner(identity.role);
  const ghost = useGhost();
  const queryClient = useQueryClient();
  const { data: header } = useQuery({
    queryKey: ["tenant-header", ghost?.tenantId ?? "self"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff", ghost?.tenantId ?? "self"],
    queryFn: fetchStaff,
    enabled: isSupabaseConfigured(),
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["shops", ghost?.tenantId ?? "self"],
    queryFn: fetchShops,
    enabled: isSupabaseConfigured(),
  });
  const { data: destinations = [] } = useQuery({
    queryKey: ["payment-destinations", ghost?.tenantId ?? "self"],
    queryFn: fetchPaymentDestinations,
    enabled: isSupabaseConfigured(),
  });

  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteShop, setInviteShop] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailReceipt, setEmailReceipt] = useState(false);

  useEffect(() => {
    if (!header) return;
    setName(header.name);
    setLegal(header.legal_name ?? header.name);
    setPhone(header.phone);
    setEmailReceipt(emailReceiptEnabled(header));
  }, [header]);

  const save = async () => {
    try {
      if (!isSupabaseConfigured()) {
        toast.success("Saved for this demo till");
        return;
      }
      await saveTenantHeader({
        name,
        legal_name: legal,
        phone,
        email_receipt_enabled: emailReceipt,
      });
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["tenant-header"] });
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const categoryDef = CATEGORY_LIST.find(
    (c) => c.id === parseCategory(header?.category ?? readDemoCategory()),
  );
  const locationText =
    header?.address_text ||
    (header?.location_lat != null && header?.location_lng != null
      ? `${Number(header.location_lat).toFixed(5)}, ${Number(header.location_lng).toFixed(5)}`
      : "");

  return (
    <AppShell
      title="Settings"
      description="Business profile, payments and staff"
      actions={
        <div className="hidden items-center gap-2 sm:flex">
          <RoleBadge>{roleLabel(identity.role)}</RoleBadge>
        </div>
      }
    >
      <p className="text-muted-foreground mb-4 text-sm">
        Shop details for the till. Your own name and photo live on{" "}
        <Link to="/app/profile" className="text-primary font-medium underline-offset-4 hover:underline">
          Profile
        </Link>
        .
      </p>

      <div className="grid w-full gap-5">
        <SettingsCard
          title="Business Profile"
          description={
            owner
              ? "Shop name and contact. Identity fields from sign-up stay locked."
              : "Locked. Only the owner can change shop details."
          }
          locked={!owner}
        >
          <ShopLogoPicker
            className="mb-5"
            url={header?.logo_url ?? null}
            name={name || identity.shop}
            disabled={!owner || !isSupabaseConfigured()}
            onFile={(file) => {
              void uploadBusinessLogo(file)
                .then(async () => {
                  toast.success("Shop photo updated");
                  await queryClient.invalidateQueries({ queryKey: ["tenant-header"] });
                })
                .catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : "Could not upload photo");
                });
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bn" className="text-muted-foreground text-xs">
                Shop name
              </Label>
              <Input id="bn" value={name} onChange={(e) => setName(e.target.value)} disabled={!owner} />
              <p className="text-muted-foreground text-xs">
                From sign-up. Shown on the till, receipts and the sidebar.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln" className="text-muted-foreground text-xs">
                Legal name
              </Label>
              <Input id="ln" value={legal} onChange={(e) => setLegal(e.target.value)} disabled={!owner} />
              <p className="text-muted-foreground text-xs">
                On tax invoices if the registered name differs. Often the same as the shop name.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph" className="text-muted-foreground text-xs">
                Contact Phone
              </Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!owner} />
            </div>
            <LockedField label="KRA PIN" value={header?.kra_pin ?? ""} hint="On invoices. Email hello@inuabiz.co.ke if this is wrong." />
            <LockedField
              label="Email"
              value={header?.email ?? ""}
              hint="Shop email from sign-up. Change your login from Profile."
            />
            <LockedField
              label="Business category"
              value={categoryDef ? `${categoryDef.emoji} ${categoryDef.label}` : ""}
              hint="Sets till screens and product fields. Email hello@inuabiz.co.ke to change it."
            />
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label className="text-muted-foreground text-xs">Location</Label>
              <p className="border-input bg-muted/50 min-h-9 rounded-md border px-3 py-2 text-sm">
                {locationText || "—"}
              </p>
              {header?.location_lat != null && header?.location_lng != null && (
                <p className="text-muted-foreground text-xs">
                  Map pin from onboarding:{" "}
                  <a
                    className="text-primary font-medium underline-offset-4 hover:underline"
                    href={`https://www.google.com/maps?q=${header.location_lat},${header.location_lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {Number(header.location_lat).toFixed(5)}, {Number(header.location_lng).toFixed(5)}
                  </a>
                  . Email hello@inuabiz.co.ke to move it.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={!owner}>
              {owner ? "Save changes" : "Owner only"}
            </Button>
          </div>
        </SettingsCard>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <SettingsCard
          className="h-full"
          title="Payment Settings"
          description={
            owner
              ? "Money from sales lands in these channels. Pair a companion phone so personal M-Pesa and Pochi close the till automatically."
              : "Locked. Payment channels are owner-only."
          }
          locked={!owner}
        >
          <PaymentChannelsPanel owner={owner} destinations={destinations} />
        </SettingsCard>

        <CompanionDeviceCard owner={owner} />

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
              onClick={() => setInviteOpen(true)}
            >
              {owner ? "+ Invite staff" : "Owner only"}
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {(staff.length ? staff : []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-[11px] font-bold",
                      s.role === "VENDOR_ADMIN"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initials(s.full_name || s.phone || "S")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.full_name || "Staff"}</p>
                    <p className="text-muted-foreground text-xs">
                      {s.phone ? prettyKePhone(s.phone) : "—"}
                    </p>
                  </div>
                </div>
                <Badge variant={s.role === "VENDOR_ADMIN" ? "default" : "outline"}>
                  {roleLabel(s.role)}
                </Badge>
              </li>
            ))}
            {!staff.length && (
              <li className="text-muted-foreground py-3 text-sm">No staff loaded yet.</li>
            )}
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
        </div>

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Send email receipt</p>
                <p className="text-muted-foreground text-xs">
                  Off by default. Emails a shop copy after cash, credit, or paid M-Pesa sales.
                  Customer SMS receipts are not available yet — share from the sale screen.
                </p>
              </div>
              <Switch
                checked={emailReceipt}
                onCheckedChange={(on) => {
                  setEmailReceipt(on);
                  window.localStorage.setItem(EMAIL_RECEIPT_KEY, on ? "true" : "false");
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void save()}>Save receipt settings</Button>
            </div>
          </SettingsCard>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite staff</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full name</Label>
              <Input
                id="inv-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Faith Wanjiku"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-phone">Phone</Label>
              <Input
                id="inv-phone"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="0712 000 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email (optional)</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="faith@shop.co.ke"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-shop">Shop</Label>
              <Select
                value={inviteShop || shops[0]?.id || ""}
                onValueChange={setInviteShop}
                disabled={!shops.length}
              >
                <SelectTrigger id="inv-shop">
                  <SelectValue placeholder="Choose shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const shopId = inviteShop || shops[0]?.id;
                if (!shopId || !invitePhone.trim()) {
                  toast.error("Shop and phone are required");
                  return;
                }
                void inviteStaff(shopId, invitePhone.trim(), inviteName.trim(), inviteEmail.trim() || undefined)
                  .then(() => {
                    toast.success("Invite sent", {
                      description: inviteEmail.trim()
                        ? "Phone invite plus branded email."
                        : "They join with OTP on that phone.",
                    });
                    setInviteOpen(false);
                    setInviteName("");
                    setInvitePhone("");
                    setInviteEmail("");
                    void queryClient.invalidateQueries({ queryKey: ["staff"] });
                  })
                  .catch((err: unknown) =>
                    toast.error("Invite failed", {
                      description: err instanceof Error ? err.message : "Try again",
                    }),
                  );
              }}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function destOf(
  destinations: PaymentDestination[],
  type: PaymentDestination["destinationType"],
) {
  return destinations.find((d) => d.destinationType === type);
}

function destDisplay(d: PaymentDestination | undefined) {
  if (!d) return "";
  if (d.destinationType === "TILL" || d.destinationType === "PAYBILL") return d.accountNumber;
  return prettyKePhone(d.accountNumber);
}

function PaymentChannelsPanel({
  owner,
  destinations,
}: {
  owner: boolean;
  destinations: PaymentDestination[];
}) {
  const connected = destinations.length > 0;
  const till = destOf(destinations, "TILL");
  const personal = destOf(destinations, "PERSONAL_MPESA");
  const paybill = destOf(destinations, "PAYBILL");
  const pochi = destOf(destinations, "POCHI");

  return (
    <div className="bg-muted/60 space-y-4 rounded-xl px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary grid size-7 shrink-0 place-items-center rounded-lg">
            <Smartphone className="text-primary-foreground size-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">M-Pesa Integration</p>
            <p className={connected ? "text-primary text-xs" : "text-muted-foreground text-xs"}>
              Status: {connected ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!owner}
          onClick={() =>
            toast.info(
              connected ? "Channels stay on file" : "No channel on file",
              {
                description: connected
                  ? "Email hello@inuabiz.co.ke to change where customer money lands."
                  : "Finish onboarding or email hello@inuabiz.co.ke to add a till or personal number.",
              },
            )
          }
        >
          {connected ? "Disconnect" : "Connect"}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChannelField
          id="buy-goods-till"
          label="Buy Goods Till"
          value={destDisplay(till)}
          primary={till?.isPrimary}
          accountName={till?.accountName}
        />
        <ChannelField
          id="personal-mpesa"
          label="Personal M-Pesa"
          value={destDisplay(personal)}
          primary={personal?.isPrimary}
          accountName={personal?.accountName}
        />
        {paybill ? (
          <ChannelField
            id="paybill"
            label="Paybill"
            value={destDisplay(paybill)}
            primary={paybill.isPrimary}
            accountName={paybill.accountName}
          />
        ) : null}
        {pochi ? (
          <ChannelField
            id="pochi"
            label="Pochi la Biashara"
            value={destDisplay(pochi)}
            primary={pochi.isPrimary}
            accountName={pochi.accountName}
          />
        ) : null}
      </div>
    </div>
  );
}

function ChannelField({
  id,
  label,
  value,
  primary,
  accountName,
}: {
  id: string;
  label: string;
  value: string;
  primary?: boolean;
  accountName?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-muted-foreground text-xs">
          {label}
        </Label>
        {primary ? (
          <Badge variant="outline" className="text-[10px] font-semibold">
            Primary
          </Badge>
        ) : null}
      </div>
      <Input id={id} value={value} placeholder="Not set" readOnly />
      {accountName ? <p className="text-muted-foreground text-xs">{accountName}</p> : null}
    </div>
  );
}

function LockedField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="border-input bg-muted/50 min-h-9 rounded-md border px-3 py-2 text-sm">
        {value.trim() ? value : "—"}
      </p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
