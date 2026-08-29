import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/app/SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchCompanionDevices,
  issueCompanionDevice,
  revokeCompanionDevice,
} from "@/lib/companion";
import { isSupabaseConfigured } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";

const APK_HREF = "/downloads/inuabiz-companion.apk";
/** Deep link into the Companion APK (see android-companion AndroidManifest). */
const COMPANION_APP_HREF = "inuabiz://companion";

function openCompanionApp() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const android = /Android/i.test(ua);
  if (!android) {
    toast.info("Open Companion on the shop Android", {
      description: "Install the APK on the phone with the M-Pesa SIM, then pair with the token.",
    });
    return;
  }
  // Intent URL: open the app if installed, otherwise fall back to APK download.
  const intent =
    "intent://companion#Intent;scheme=inuabiz;package=ke.co.inuabiz.companion;" +
    `S.browser_fallback_url=${encodeURIComponent(window.location.origin + APK_HREF)};end`;
  window.location.href = intent;
}

export function CompanionDeviceCard({ owner }: { owner: boolean }) {
  const queryClient = useQueryClient();
  const { data: devices = [] } = useQuery({
    queryKey: ["companion-devices"],
    queryFn: fetchCompanionDevices,
    enabled: isSupabaseConfigured(),
  });
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Business phone");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const active = devices.filter((d) => !d.revoked_at);

  const pair = async () => {
    if (!owner) return;
    setBusy(true);
    try {
      const issued = await issueCompanionDevice(label.trim() || "Business phone");
      setIssuedToken(issued.token);
      toast.success("Phone paired", { description: "Install the APK on the shop SIM, then paste this token." });
      void queryClient.invalidateQueries({ queryKey: ["companion-devices"] });
    } catch (err: unknown) {
      toast.error("Could not pair", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0">
      <SettingsCard
        className="h-full"
        title="Companion phone"
        description={
          owner
            ? "Install this APK on the handset that receives shop M-Pesa SMS — personal, Pochi, till, or paybill. Pair it here so the till goes green when the SMS arrives."
            : "Locked. Only the owner can pair a companion phone."
        }
        locked={!owner}
      >
        <ol className="text-muted-foreground space-y-2 text-sm leading-relaxed">
          <li>
            <span className="text-foreground font-medium">1.</span> Download the APK onto the phone
            that gets those SMS (the shop SIM). Allow install from this source.
          </li>
          <li>
            <span className="text-foreground font-medium">2.</span> Tap Pair phone, copy the token
            (shown once), paste it in the companion app, and allow SMS.
          </li>
          <li>
            <span className="text-foreground font-medium">3.</span> Leave the quiet notification
            running. Sell on this till as usual — you can still type the M-Pesa code by hand.
          </li>
        </ol>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Not on Play Store. We only receive the confirmation code, amount, and the name (or bank)
          that paid — the same details as the M-Pesa SMS.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={APK_HREF} download>
              <Download />
              Download APK
            </a>
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => openCompanionApp()}>
            <ExternalLink />
            Open Companion
          </Button>
          <Button size="sm" disabled={!owner || busy} onClick={() => void pair()}>
            {busy ? "Pairing…" : "Pair phone"}
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companion-label" className="text-muted-foreground text-xs">
            Device name
          </Label>
          <Input
            id="companion-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={!owner}
            placeholder="Till SIM — Mama's phone"
          />
        </div>
        <ul className="divide-y divide-border">
          {active.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-primary grid size-8 place-items-center rounded-lg">
                  <Smartphone className="text-primary-foreground size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{d.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {d.token_prefix}… ·{" "}
                    {d.last_seen_at
                      ? `Last SMS ${new Date(d.last_seen_at).toLocaleString("en-KE")}`
                      : "Not seen yet"}
                    {d.expected_msisdn ? ` · ${prettyKePhone(d.expected_msisdn)}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!owner}
                onClick={() => {
                  void revokeCompanionDevice(d.id)
                    .then(() => {
                      toast.success("Phone unpaired");
                      void queryClient.invalidateQueries({ queryKey: ["companion-devices"] });
                    })
                    .catch((err: unknown) =>
                      toast.error(err instanceof Error ? err.message : "Could not revoke"),
                    );
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
          {!active.length && (
            <li className="text-muted-foreground py-3 text-sm">No companion phone paired yet.</li>
          )}
        </ul>
      </SettingsCard>

      <Dialog open={Boolean(issuedToken)} onOpenChange={(open) => !open && setIssuedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste this token in the companion app</DialogTitle>
            <DialogDescription>
              Download the APK on the shop SIM if you have not already. This token is shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg px-3 py-2 font-mono text-xs break-all">{issuedToken}</div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <a href={COMPANION_APP_HREF}>
                <ExternalLink />
                Open Companion
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={APK_HREF} download>
                <Download />
                Download APK
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!issuedToken) return;
                void navigator.clipboard.writeText(issuedToken).then(
                  () => toast.success("Token copied"),
                  () => toast.error("Could not copy"),
                );
              }}
            >
              <Copy />
              Copy token
            </Button>
            <Button onClick={() => setIssuedToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
