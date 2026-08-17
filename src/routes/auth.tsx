import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InuaBiz vendor login" },
      {
        name: "description",
        content:
          "Sign in to InuaBiz with your Kenyan mobile number and a 4-digit SMS code. No passwords, no email required.",
      },
      { property: "og:title", content: "Sign in to InuaBiz" },
      { property: "og:description", content: "Phone-first login for Kenyan vendors." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero-gradient relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="grid-paper absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="relative">
          <Link to="/">
            <Logo tone="inverted" />
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-primary-foreground text-3xl font-bold leading-tight">
            "I stopped losing money to the ledger book."
          </h2>
          <p className="text-primary-foreground/75 mt-4 leading-relaxed">
            Vendors on InuaBiz recover an average of KES 9,400 a month in credit that used to
            disappear between pages.
          </p>
          <p className="text-gold mt-6 text-sm font-semibold">Mama Njoroge · Kasarani</p>
        </div>
        <p className="text-primary-foreground/50 relative text-xs">
          Secured with phone OTP. We never store passwords.
        </p>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          {step === "phone" ? (
            <div className="mt-10 lg:mt-0">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Enter your Kenyan mobile number and we'll send you a 4-digit code.
              </p>

              <form
                className="mt-8 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep("otp");
                  toast.info("Code sent", { description: `Demo code 1234 sent to ${phone}` });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile number</Label>
                  <div className="relative">
                    <Smartphone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="phone"
                      className="pl-9"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">Works with 07xx and 01xx numbers.</p>
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Send code
                </Button>
              </form>

              <p className="text-muted-foreground mt-8 text-center text-sm">
                New to InuaBiz?{" "}
                <Link to="/onboarding" className="text-primary font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-10 lg:mt-0">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="size-4" /> Change number
              </button>
              <h1 className="mt-4 text-2xl font-bold">Enter your code</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                We sent a 4-digit code to <span className="text-foreground font-medium">{phone}</span>.
              </p>

              <form
                className="mt-8 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Signed in", { description: "Opening your dashboard…" });
                  void navigate({ to: "/app" });
                }}
              >
                <InputOTP maxLength={4} value={code} onChange={setCode}>
                  <InputOTPGroup className="w-full justify-between gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 flex-1 rounded-xl border text-lg"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <Button type="submit" size="lg" className="w-full">
                  Verify and continue
                </Button>
                <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="size-3.5" /> Demo mode — any 4 digits will work.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
