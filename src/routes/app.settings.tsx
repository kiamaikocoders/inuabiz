import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials, isVendorOwner, roleLabel, useIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import { prettyKePhone } from "@/lib/phone";
import {
  fetchShops,
  fetchStaff,
  fetchTenantHeader,
  inviteStaff,
  saveTenantHeader,
  EMAIL_RECEIPT_KEY,
  emailReceiptEnabled,
} from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORY_LIST, parseCategory, readDemoCategory, writeDemoCategory } from "@/lib/category";

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
  const queryClient = useQueryClient();
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaff,
    enabled: isSupabaseConfigured(),
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: isSupabaseConfigured(),
  });

  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loc, setLoc] = useState("");
  const [category, setCategory] = useState(() => readDemoCategory());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteShop, setInviteShop] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailReceipt, setEmailReceipt] = useState(() => emailReceiptEnabled());

  useEffect(() => {
    if (!header) return;
    setName(header.name);
    setLegal(header.legal_name ?? header.name);
    setPin(header.kra_pin ?? "");
    setEmail(header.email ?? "");
    setPhone(header.phone);
    setLoc(header.address_text ?? "");
    setCategory(parseCategory(header.category));
  }, [header]);

  const save = async () => {
    try {
      if (!isSupabaseConfigured()) {
        writeDemoCategory(parseCategory(category));
        toast.success("Category saved for this demo till");
        window.location.reload();
        return;
      }
      await saveTenantHeader({
        name,
        legal_name: legal,
        kra_pin: pin.trim() ? pin.trim().toUpperCase() : null,
        email: email || null,
        phone,
        address_text: loc || null,
        category,
      });
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["tenant-header"] });
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Check KRA PIN format (A123456789Z).",
      });
    }
  };

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
                Trading name
              </Label>
              <Input id="bn" value={name} onChange={(e) => setName(e.target.value)} disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln" className="text-muted-foreground text-xs">
                Legal name
              </Label>
              <Input id="ln" value={legal} onChange={(e) => setLegal(e.target.value)} disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-muted-foreground text-xs">
                KRA PIN
              </Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="A123456789Z"
                disabled={!owner}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em" className="text-muted-foreground text-xs">
                Email
              </Label>
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat" className="text-muted-foreground text-xs">
                Business Category
              </Label>
              <Select value={parseCategory(category)} onValueChange={(v) => setCategory(parseCategory(v))} disabled={!owner && isSupabaseConfigured()}>
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_LIST.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Changes the till, extra screens and product fields for this shop.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-muted-foreground text-xs">
                Location
              </Label>
              <Input id="loc" value={loc} onChange={(e) => setLoc(e.target.value)} disabled={!owner} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph" className="text-muted-foreground text-xs">
                Contact Phone
              </Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!owner} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={!owner}>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Send email receipt</p>
                <p className="text-muted-foreground text-xs">
                  Off by default. Turn on to email a shop copy after cash, credit, or paid M-Pesa sales.
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
