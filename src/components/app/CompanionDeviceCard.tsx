import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Smartphone } from "lucide-react";
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
      toast.success("Phone paired", { description: "Paste this token into the companion app once." });
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
    <>
      <SettingsCard
        title="Companion phone"
        description={
          owner
            ? "Sideload the APK on the handset that receives M-Pesa SMS. Desktop POS goes green when that SMS arrives."
            : "Locked. Only the owner can pair a companion phone."
        }
        locked={!owner}
        action={
          <Button size="sm" disabled={!owner || busy} onClick={() => void pair()}>
            {busy ? "Pairing…" : "Pair phone"}
          </Button>
        }
      >
        <div className="space-y-3">
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
          <p className="text-muted-foreground text-xs leading-relaxed">
            Install from{" "}
            <Link to="/companion" className="text-primary font-medium underline-offset-4 hover:underline">
              inuabiz.co.ke/companion
            </Link>
            . SMS stay on that phone — we only receive amount, sender and the confirmation code.
          </p>
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
        </div>
      </SettingsCard>

      <Dialog open={Boolean(issuedToken)} onOpenChange={(open) => !open && setIssuedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste this token in the companion app</DialogTitle>
            <DialogDescription>
              It is shown once. If you lose it, revoke the device and pair again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg px-3 py-2 font-mono text-xs break-all">{issuedToken}</div>
          <DialogFooter>
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
              <Copy className="mr-2 size-4" />
              Copy token
            </Button>
            <Button onClick={() => setIssuedToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
