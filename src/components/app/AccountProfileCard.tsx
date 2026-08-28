import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Laptop,
  Lock,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ShopLogoPicker } from "@/components/app/ShopLogoPicker";
import { PasswordInput } from "@/components/auth/PasswordInput";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  changePassword,
  describeThisDevice,
  disableTotp,
  enrollTotp,
  friendlyMfaError,
  signOut,
  signOutOtherSessions,
  totpFactorEnabled,
  updateProfile,
  verifyTotpEnrollment,
} from "@/lib/auth";
import { uploadProfileAvatar } from "@/lib/profile-avatar";
import {
  clearStoredIdentity,
  isVendorOwner,
  persistAppLocale,
  persistIdentity,
  readAppLocale,
  roleLabel,
  type AppIdentity,
  type AppLocale,
} from "@/lib/identity";
import { stopGhost } from "@/lib/ghost";
import { fetchBillingSnapshot, vendorPlanBadge } from "@/lib/payments";
import {
  fetchNotificationPrefs,
  fetchTenantHeader,
  saveNotificationPrefs,
  saveTenantHeader,
} from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function AccountProfileCard({
  identity,
  kind,
}: {
  identity: AppIdentity;
  kind: "vendor" | "admin";
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const owner = kind === "admin" || isVendorOwner(identity.role);
  const live = isSupabaseConfigured();
  const device = useMemo(() => describeThisDevice(), []);

  const { data: snap } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingSnapshot,
    enabled: kind === "vendor",
  });
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: kind === "vendor" && live,
  });
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: fetchNotificationPrefs,
    enabled: live,
  });
  const { data: totpOn = false } = useQuery({
    queryKey: ["mfa-totp"],
    queryFn: totpFactorEnabled,
    enabled: live,
  });

  const plan = vendorPlanBadge(snap);
  const [fullName, setFullName] = useState(identity.fullName);
  const [phone, setPhone] = useState(identity.phone);
  const [address, setAddress] = useState("");
  const [locale, setLocale] = useState<AppLocale>("en-KE");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({
    fullName: identity.fullName,
    phone: identity.phone,
    address: "",
    locale: "en-KE" as AppLocale,
    emailAlerts: true,
  });

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTotp, setPasswordTotp] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaQr, setMfaQr] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [disableMfaOpen, setDisableMfaOpen] = useState(false);
  const [disableMfaCode, setDisableMfaCode] = useState("");
  const [disableMfaBusy, setDisableMfaBusy] = useState(false);
  const [logoutOthersOpen, setLogoutOthersOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(identity.avatarUrl);

  useEffect(() => {
    const next = readAppLocale();
    setLocale(next);
    setSaved((prev) => ({ ...prev, locale: next }));
  }, []);

  useEffect(() => {
    setFullName(identity.fullName);
    setPhone(identity.phone);
    setAvatarUrl(identity.avatarUrl);
    setSaved((prev) => ({ ...prev, fullName: identity.fullName, phone: identity.phone }));
  }, [identity.fullName, identity.phone, identity.avatarUrl]);

  useEffect(() => {
    if (header?.address_text) {
      setAddress(header.address_text);
      setSaved((prev) => ({ ...prev, address: header.address_text ?? "" }));
      return;
    }
    if (header?.location_lat != null && header?.location_lng != null) {
      const pin = `Pin · ${Number(header.location_lat).toFixed(5)}, ${Number(header.location_lng).toFixed(5)}`;
      setAddress(pin);
      setSaved((prev) => ({ ...prev, address: pin }));
    }
  }, [header?.address_text, header?.location_lat, header?.location_lng]);

  useEffect(() => {
    if (!prefs) return;
    setEmailAlerts(prefs.channel_email);
    setSaved((prev) => ({
      ...prev,
      emailAlerts: prefs.channel_email,
    }));
  }, [prefs]);

  const dirty =
    fullName !== saved.fullName ||
    phone !== saved.phone ||
    address !== saved.address ||
    locale !== saved.locale ||
    emailAlerts !== saved.emailAlerts;

  const discard = () => {
    setFullName(saved.fullName);
    setPhone(saved.phone);
    setAddress(saved.address);
    setLocale(saved.locale);
    setEmailAlerts(saved.emailAlerts);
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      persistIdentity(kind, { fullName, phone, email: identity.email, avatarUrl });
      persistAppLocale(locale);
      if (live) {
        await updateProfile({ full_name: fullName, phone });
        if (kind === "vendor" && owner && address !== saved.address) {
          await saveTenantHeader({ address_text: address.trim() || null });
        }
        if (emailAlerts !== saved.emailAlerts) {
          await saveNotificationPrefs({
            channel_email: emailAlerts,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["identity"] });
        await queryClient.invalidateQueries({ queryKey: ["tenant-header"] });
        await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      }
      setSaved({ fullName, phone, address, locale, emailAlerts });
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

  const startMfa = async () => {
    if (!live) {
      toast.info("Demo till", { description: "Authenticator setup needs a live sign-in." });
      return;
    }
    setMfaBusy(true);
    try {
      const enrolled = await enrollTotp();
      setMfaQr(enrolled);
      setMfaCode("");
      setMfaOpen(true);
    } catch (error) {
      toast.error(friendlyMfaError(error instanceof Error ? error.message : "Could not start two-factor setup"));
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4 pb-4" onSubmit={(event) => void onSave(event)}>
      <div className="surface-card flex items-center gap-4 p-6">
        <ShopLogoPicker
          compact
          tone={kind === "admin" ? "admin" : "vendor"}
          title="Profile photo"
          url={avatarUrl || null}
          name={fullName}
          disabled={avatarBusy}
          onFile={(file) => {
            setAvatarBusy(true);
            void uploadProfileAvatar(file)
              .then(async (url) => {
                setAvatarUrl(url);
                persistIdentity(kind, { avatarUrl: url });
                toast.success("Profile photo updated");
                await queryClient.invalidateQueries({ queryKey: ["identity"] });
              })
              .catch((error: unknown) => {
                toast.error(error instanceof Error ? error.message : "Could not upload photo");
              })
              .finally(() => setAvatarBusy(false));
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{fullName || "Your profile"}</p>
          <p className="text-muted-foreground truncate text-sm">
            {kind === "admin" ? "InuaBiz operator" : identity.shop}
          </p>
          <Badge className="mt-2" variant="secondary">
            {roleLabel(identity.role)}
          </Badge>
        </div>
        {kind === "vendor" && (
          <Badge
            className={cn(
              "shrink-0",
              plan === "Free trial" &&
                "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary",
              plan === "Standard" &&
                "bg-gold text-gold-foreground border-transparent hover:bg-gold",
              plan === "Compliance" &&
                "border-transparent bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            {plan}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-6">
          <SectionTitle icon={UserRound} well="bg-emerald-500 text-white shadow-emerald-500/40">
            Personal information
          </SectionTitle>
          <div className="space-y-4">
            {kind === "vendor" && owner && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Shop photo and trading address live under{" "}
                <Link to="/app/settings" className="text-primary font-medium underline-offset-4 hover:underline">
                  Settings
                </Link>
                . This page is your personal profile only.
              </p>
            )}
            <Field label="Full name" htmlFor="full-name">
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </Field>
            <Field label="Email address" htmlFor="email">
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={identity.email}
                  readOnly
                  className="bg-muted/60 text-muted-foreground pl-9"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Email is tied to your sign-in and can’t be changed here.
              </p>
            </Field>
            <Field label="Phone number" htmlFor="phone">
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </Field>
            {kind === "vendor" && (
              <Field label="Physical address" htmlFor="address">
                <Textarea
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  disabled={!owner}
                  rows={2}
                />
                <p className="text-muted-foreground text-xs">
                  Shop location used on receipts.{" "}
                  <Link
                    to="/app/settings"
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Shop settings
                  </Link>
                </p>
              </Field>
            )}
          </div>
        </section>

        <div className="grid gap-4">
          <section className="surface-card p-6">
            <SectionTitle icon={ShieldCheck} well="bg-sky-500 text-white shadow-sky-500/40">
              Account security
            </SectionTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-muted-foreground text-xs">Use at least 8 characters</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Two-factor authentication</p>
                    <Badge variant={totpOn ? "default" : "secondary"}>{totpOn ? "On" : "Off"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Extra code from an authenticator app at sign-in
                  </p>
                </div>
                <Switch
                  checked={totpOn}
                  disabled={mfaBusy || disableMfaBusy}
                  onCheckedChange={(on) => {
                    if (on) void startMfa();
                    else {
                      setDisableMfaCode("");
                      setDisableMfaOpen(true);
                    }
                  }}
                />
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <SectionTitle icon={SlidersHorizontal} well="bg-gold text-gold-foreground shadow-gold/40">
              Preferences
            </SectionTitle>
            <div className="space-y-4">
              <Field label="Language" htmlFor="language">
                <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-KE">English (UK)</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">Notifications</p>
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={emailAlerts}
                    onCheckedChange={(value) => setEmailAlerts(value === true)}
                  />
                  Email updates
                </label>
                {kind === "vendor" && (
                  <p className="text-muted-foreground text-xs">
                    Till bell, sound and this-device alerts live on{" "}
                    <Link to="/app/notifications" className="text-primary font-medium underline">
                      Notifications
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="surface-card p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <SectionTitle icon={Laptop} well="bg-violet-500 text-white shadow-violet-500/40" className="mb-0">
            Active sessions
          </SectionTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setLogoutOthersOpen(true)}
          >
            Log out all other devices
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-violet-500 text-white shadow-[0_6px_12px_-6px] shadow-violet-500/40">
              <Laptop className="size-4" strokeWidth={2.4} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{device.title}</p>
                <Badge className="bg-primary-soft text-primary border-transparent hover:bg-primary-soft">
                  Current
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">{device.detail}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>

      <div className="bg-background/90 sticky bottom-0 z-20 -mx-4 -mb-4 flex justify-end gap-2 border-t border-border px-4 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="button" variant="outline" disabled={!dirty || saving} onClick={discard}>
          Discard
        </Button>
        <Button type="submit" disabled={!dirty || saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open);
          if (!open) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordTotp("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then a new one of at least 8 characters. You stay signed in
              on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
              />
            </div>
            {totpOn && (
              <div className="space-y-1.5">
                <Label htmlFor="password-totp">Authenticator code</Label>
                <Input
                  id="password-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={passwordTotp}
                  onChange={(event) =>
                    setPasswordTotp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                />
                <p className="text-muted-foreground text-xs">
                  Two-factor is on, so this change needs a fresh code.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={passwordBusy}
              onClick={() => {
                if (!currentPassword) {
                  toast.error("Enter your current password");
                  return;
                }
                if (newPassword.length < 8) {
                  toast.error("Password too short", { description: "Use at least 8 characters." });
                  return;
                }
                if (newPassword !== confirmPassword) {
                  toast.error("Passwords do not match");
                  return;
                }
                if (newPassword === currentPassword) {
                  toast.error("Choose a different password");
                  return;
                }
                if (totpOn && passwordTotp.length !== 6) {
                  toast.error("Enter your 6-digit authenticator code");
                  return;
                }
                if (!live) {
                  toast.info("Demo till", { description: "Password is not stored without sign-in." });
                  setPasswordOpen(false);
                  return;
                }
                setPasswordBusy(true);
                void changePassword(currentPassword, newPassword, totpOn ? passwordTotp : undefined)
                  .then(() => {
                    toast.success("Password updated");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordTotp("");
                    setPasswordOpen(false);
                  })
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Could not update password");
                  })
                  .finally(() => setPasswordBusy(false));
              }}
            >
              {passwordBusy ? "Saving…" : "Save password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mfaOpen}
        onOpenChange={(open) => {
          setMfaOpen(open);
          if (!open) {
            setMfaQr(null);
            setMfaCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up two-factor</DialogTitle>
            <DialogDescription>
              Scan this with Google Authenticator or Authy, then enter the 6-digit code.
            </DialogDescription>
          </DialogHeader>
          {mfaQr && (
            <div className="space-y-3">
              <img
                src={mfaQr.qr}
                alt="Authenticator QR code"
                className="mx-auto size-44 rounded-xl border border-border bg-white p-2"
              />
              <p className="text-muted-foreground text-center text-xs break-all">
                Or type this secret: {mfaQr.secret}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-code">Authenticator code</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMfaOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mfaBusy || !mfaQr || mfaCode.length !== 6}
              onClick={() => {
                if (!mfaQr) return;
                setMfaBusy(true);
                void verifyTotpEnrollment(mfaQr.factorId, mfaCode)
                  .then(async () => {
                    toast.success("Two-factor is on");
                    setMfaOpen(false);
                    setMfaQr(null);
                    setMfaCode("");
                    await queryClient.invalidateQueries({ queryKey: ["mfa-totp"] });
                  })
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "That code did not match");
                  })
                  .finally(() => setMfaBusy(false));
              }}
            >
              {mfaBusy ? "Verifying…" : "Verify and enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disableMfaOpen}
        onOpenChange={(open) => {
          setDisableMfaOpen(open);
          if (!open) setDisableMfaCode("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off two-factor?</DialogTitle>
            <DialogDescription>
              Enter a current authenticator code to confirm. Sign-in will only need email and password
              until you set it up again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="disable-mfa-code">Authenticator code</Label>
            <Input
              id="disable-mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={disableMfaCode}
              onChange={(event) =>
                setDisableMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDisableMfaOpen(false)}>
              Keep it on
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={disableMfaBusy || disableMfaCode.length !== 6}
              onClick={() => {
                if (!live) {
                  toast.info("Demo till", { description: "Two-factor needs a live sign-in." });
                  return;
                }
                setDisableMfaBusy(true);
                void disableTotp(disableMfaCode)
                  .then(async () => {
                    toast.success("Two-factor is off");
                    setDisableMfaOpen(false);
                    setDisableMfaCode("");
                    await queryClient.invalidateQueries({ queryKey: ["mfa-totp"] });
                  })
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Could not turn off two-factor");
                  })
                  .finally(() => setDisableMfaBusy(false));
              }}
            >
              {disableMfaBusy ? "Turning off…" : "Turn off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutOthersOpen} onOpenChange={setLogoutOthersOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This device stays signed in. Every other browser and phone using this account is signed
              out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!live) {
                  toast.info("Demo till", { description: "Only this browser is signed in here." });
                  return;
                }
                void signOutOtherSessions()
                  .then(() => toast.success("Other devices signed out"))
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Could not sign out others");
                  });
              }}
            >
              Log out others
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function SectionTitle({
  icon: Icon,
  well,
  className,
  children,
}: {
  icon: LucideIcon;
  well: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mb-5 flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg shadow-[0_6px_12px_-6px]",
          well,
        )}
      >
        <Icon className="size-3.5" strokeWidth={2.4} />
      </span>
      <h2 className="font-semibold">{children}</h2>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
