import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { AuthLegalConsent } from "@/components/auth/AuthLegal";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AUTH_SCENES } from "@/lib/auth-scenes";
import { resendSignupOtp, signUpWithEmail, verifyEmailOtp } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/mock-data";
import { fetchPublicPricing } from "@/lib/plans";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — InuaBiz" },
      {
        name: "description",
        content:
          "Sign up with your name, shop, email and password. Verify by email OTP, then finish shop onboarding. Free trial on your first shop.",
      },
    ],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"form" | "otp">("form");
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const submitForm = async () => {
    if (password.length < 8) {
      toast.error("Password too short", { description: "Use at least 8 characters." });
      return;
    }
    if (!acceptedTerms) {
      toast.error("Please accept the terms", {
        description: "Tick the box to agree to the Terms of Service and Privacy Policy.",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await signUpWithEmail({ fullName, shopName, email, password });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("inuabiz:signupEmail", email);
        sessionStorage.setItem("inuabiz:pendingShop", shopName);
      }
      if (res.needsOtp || res.demo) {
        setStage("otp");
        toast.info(res.demo ? "Demo code 123456" : "Check your email", {
          description: res.demo
            ? "Supabase is not configured — enter 123456 to continue."
            : `We sent a code to ${email}.`,
        });
        return;
      }
      toast.success("Account created");
      await navigate({ to: "/onboarding" });
    } catch (err: unknown) {
      toast.error("Could not create account", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setBusy(true);
    try {
      const res = await verifyEmailOtp(email, otp);
      if (res.demo && otp !== "123456") {
        throw new Error("Enter 123456 in demo, or the 6-digit email code");
      }
      toast.success("Email verified", { description: "Finish setting up your shop." });
      await navigate({ to: "/onboarding" });
    } catch (err: unknown) {
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Check the code and retry",
      });
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    try {
      const res = await resendSignupOtp(email);
      toast.info(res.demo ? "Demo mode — use 123456" : "Code sent again", {
        description: res.demo ? undefined : `Check ${email} for a 6-digit code.`,
      });
    } catch (err: unknown) {
      toast.error("Could not resend", {
        description: err instanceof Error ? err.message : "Wait a minute and try again",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSplit scene={stage === "otp" ? AUTH_SCENES.verify : AUTH_SCENES.signup}>
      <div>
        {stage === "form" ? (
          <>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Then we email you a code. Your first shop starts a {trialDays}-day trial — extra shops
              are paid before they go live.
            </p>
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitForm();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="nm">Your name</Label>
                <Input
                  id="nm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sn">Shop name</Label>
                <Input
                  id="sn"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Your shop name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="em"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@shop.co.ke"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <PasswordInput
                  id="pw"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <AuthLegalConsent checked={acceptedTerms} onCheckedChange={setAcceptedTerms} />
              <Button type="submit" size="lg" className="w-full" disabled={busy || !acceptedTerms}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the code sent to <span className="text-foreground font-medium">{email}</span>.
            </p>
            <form
              className="mt-8 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                void submitOtp();
              }}
            >
              <InputOTP maxLength={6} value={otp} onChange={setOtp} aria-label="Email verification code">
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 rounded-xl border" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button type="submit" size="lg" className="w-full" disabled={busy || otp.length < 6}>
                {busy ? "Checking…" : "Verify and continue"}
              </Button>
              <button
                type="button"
                className="text-primary w-full text-center text-sm font-medium hover:underline"
                disabled={busy}
                onClick={() => void resendCode()}
              >
                Resend code
              </button>
              <p className="text-muted-foreground text-center text-xs">
                Already verified?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </>
        )}
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
