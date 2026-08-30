import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { AUTH_SCENES } from "@/lib/auth-scenes";
import { fetchProfile, verifyPhoneOtp } from "@/lib/auth";
import { privateHead } from "@/lib/seo";

type VerifySearch = { phone?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): VerifySearch => ({
    phone: typeof s["phone"] === "string" ? s["phone"] : "",
  }),
  head: () => privateHead("Verify code — InuaBiz"),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const phone =
    search.phone ||
    (typeof window !== "undefined" ? sessionStorage.getItem("inuabiz:otpPhone") : "") ||
    "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthSplit scene={AUTH_SCENES.verify}>
      <div>
        <Link
          to="/login"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> Change number
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Enter your code</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We sent a 4-digit code to <span className="text-foreground font-medium">{phone || "your phone"}</span>.
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void (async () => {
              try {
                const res = await verifyPhoneOtp(phone, code);
                if (res.demo && code.length < 4) {
                  throw new Error("Enter 4 digits");
                }
                const profile = await fetchProfile();
                toast.success("Signed in", { description: "Opening your workspace…" });
                if (profile?.role === "SUPER_ADMIN") {
                  await navigate({ to: "/admin" });
                  return;
                }
                if (!profile?.tenant_id || !profile.onboarding_completed_at) {
                  await navigate({ to: "/onboarding" });
                  return;
                }
                await navigate({ to: "/app" });
              } catch (err: unknown) {
                toast.error("Verification failed", {
                  description: err instanceof Error ? err.message : "Check the code and retry",
                });
                return;
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <InputOTP maxLength={4} value={code} onChange={setCode}>
            <InputOTPGroup className="w-full justify-between gap-3">
              {[0, 1, 2, 3].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-14 flex-1 rounded-xl border text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 4}>
            {busy ? "Verifying…" : "Verify and continue"}
          </Button>
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" /> Demo fallback — any 4 digits work if SMS is not enabled.
          </p>
        </form>
      </div>
    </AuthSplit>
  );
}
