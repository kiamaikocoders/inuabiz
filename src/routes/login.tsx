import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { sendPhoneOtp } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — InuaBiz vendor login" },
      {
        name: "description",
        content:
          "Sign in to InuaBiz with your Kenyan mobile number. We send a 4-digit SMS code. No passwords, no email.",
      },
      { property: "og:title", content: "Sign in to InuaBiz" },
      { property: "og:description", content: "Phone-first login for Kenyan vendors." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthSplit>
      <div className="mt-10 lg:mt-0">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter your Kenyan mobile number and we'll send you a 4-digit code.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void sendPhoneOtp(phone)
              .then((res) => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("inuabiz:otpPhone", phone);
                }
                toast.info(res.demo ? "Demo code 1234" : "Code sent", {
                  description: res.demo
                    ? `OTP provider not required — use 1234 for ${phone}`
                    : `SMS sent to ${phone}`,
                });
                void navigate({ to: "/verify", search: { phone } });
              })
              .catch((err: unknown) => {
                toast.error("Could not send code", {
                  description: err instanceof Error ? err.message : "Try again",
                });
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("inuabiz:otpPhone", phone);
                }
                void navigate({ to: "/verify", search: { phone } });
              })
              .finally(() => setBusy(false));
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

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          New to InuaBiz?{" "}
          <Link to="/onboarding" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
