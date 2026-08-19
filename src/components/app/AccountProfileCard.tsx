import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { signOut, updateProfile } from "@/lib/auth";
import {
  clearStoredIdentity,
  initials,
  persistIdentity,
  roleLabel,
  type AppIdentity,
} from "@/lib/identity";
import { stopGhost } from "@/lib/ghost";
import { cn } from "@/lib/utils";

export function AccountProfileCard({
  identity,
  kind,
}: {
  identity: AppIdentity;
  kind: "vendor" | "admin";
}) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(identity.fullName);
  const [phone, setPhone] = useState(identity.phone);
  const [email, setEmail] = useState(identity.email);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(identity.fullName);
    setPhone(identity.phone);
    setEmail(identity.email);
  }, [identity.email, identity.fullName, identity.phone]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      persistIdentity(kind, { fullName, phone, email });
      await updateProfile({ full_name: fullName, phone });
      toast.success("Profile saved", {
        description:
          kind === "admin"
            ? "Your operator details are updated."
            : "Your account details are updated.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = () => {
    stopGhost();
    clearStoredIdentity();
    void signOut()
      .catch(() => undefined)
      .finally(() => {
        toast.success("Signed out");
        void navigate({ to: "/login" });
      });
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="surface-card flex items-center gap-4 p-6">
        <span
          className={cn(
            "grid size-16 place-items-center rounded-full text-lg font-bold",
            kind === "admin"
              ? "bg-foreground text-background"
              : "bg-primary-soft text-primary",
          )}
        >
          {initials(fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{fullName}</p>
          <p className="text-muted-foreground truncate text-sm">{identity.shop}</p>
          <Badge className="mt-2" variant="secondary">
            {roleLabel(identity.role)}
          </Badge>
        </div>
      </div>

      <form className="surface-card space-y-5 p-6" onSubmit={(event) => void onSave(event)}>
        <div>
          <h2 className="font-semibold">Account</h2>
          <p className="text-muted-foreground text-sm">
            {kind === "admin"
              ? "This is your operator identity — not platform pricing or integrations."
              : "This is your personal account. Shop name, till and staff live under Settings."}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
        {kind === "vendor" && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <Label className="text-sm">SMS alerts</Label>
              <p className="text-muted-foreground text-xs">
                Stock-outs, overdue duka debt and subscription reminders
              </p>
            </div>
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving…" : "Save profile"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={kind === "admin" ? "/admin/settings" : "/app/settings"}>
              {kind === "admin" ? "Platform settings" : "Shop settings"}
            </Link>
          </Button>
        </div>
      </form>

      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="font-semibold">Session</p>
          <p className="text-muted-foreground text-sm">
            Sign out on this device. Your shop data stays in the cloud.
          </p>
        </div>
        <Button variant="outline" className="text-destructive" onClick={onSignOut}>
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
