import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AUTH_SCENES } from "@/lib/auth-scenes";
import {
  fetchProfile,
  sendPasswordReset,
  signInWithEmail,
  updatePassword,
} from "@/lib/auth";
import { getSupabase, getRememberMe, setRememberMe, REMEMBER_EMAIL_KEY } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — InuaBiz vendor login" },
      {
        name: "description",
        content: "Sign in to InuaBiz with the email and password you used at signup.",
      },
      { property: "og:title", content: "Sign in to InuaBiz" },
      { property: "og:description", content: "Email and password login for Kenyan vendors." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [rememberMe, setRememberMeState] = useState(true);
  const [stage, setStage] = useState<"signin" | "forgot" | "reset">("signin");

  useEffect(() => {
    setRememberMeState(getRememberMe());
    const saved = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStage("reset");
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthSplit scene={AUTH_SCENES.login}>
      <div>
        {stage === "forgot" ? (
          <>
            <h1 className="text-2xl font-bold">Reset password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              We send a one-time link to this email. It expires in 15 minutes.
            </p>
            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                void sendPasswordReset(email)
                  .then((res) => {
                    toast.success(res.demo ? "Demo: check your inbox" : "Reset link sent", {
                      description: `If ${email} has an account, the email is on the way.`,
                    });
                    setStage("signin");
                  })
                  .catch((err: unknown) => {
                    toast.error("Could not send reset", {
                      description: err instanceof Error ? err.message : "Try again",
                    });
                  })
                  .finally(() => setBusy(false));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="you@shop.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="text-muted-foreground mt-8 text-center text-sm">
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setStage("signin")}
              >
                Back to sign in
              </button>
            </p>
          </>
        ) : stage === "reset" ? (
          <>
            <h1 className="text-2xl font-bold">Choose a new password</h1>
            <p className="text-muted-foreground mt-2 text-sm">Use at least 8 characters.</p>
            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (password.length < 8) {
                  toast.error("Password too short", { description: "Use at least 8 characters." });
                  return;
                }
                setBusy(true);
                void updatePassword(password)
                  .then(async () => {
                    toast.success("Password updated");
                    const profile = await fetchProfile();
                    if (profile?.role === "SUPER_ADMIN") {
                      await navigate({ to: "/admin" });
                      return;
                    }
                    if (!profile?.tenant_id || !profile.onboarding_completed_at) {
                      await navigate({ to: "/onboarding" });
                      return;
                    }
                    await navigate({ to: "/app" });
                  })
                  .catch((err: unknown) => {
                    toast.error("Could not update password", {
                      description: err instanceof Error ? err.message : "Try the reset link again",
                    });
                  })
                  .finally(() => setBusy(false));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Save password"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in with your email and password. If you never finished shop setup, we send you back
              there first.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setRememberMe(rememberMe);
                if (rememberMe) window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
                else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
                setBusy(true);
                void signInWithEmail(email, password)
                  .then(async () => {
                    const profile = await fetchProfile();
                    toast.success("Signed in");
                    if (profile?.role === "SUPER_ADMIN") {
                      await navigate({ to: "/admin" });
                      return;
                    }
                    if (!profile?.tenant_id || !profile.onboarding_completed_at) {
                      await navigate({ to: "/onboarding" });
                      return;
                    }
                    await navigate({ to: "/app" });
                  })
                  .catch((err: unknown) => {
                    toast.error("Could not sign in", {
                      description: err instanceof Error ? err.message : "Check email and password",
                    });
                  })
                  .finally(() => setBusy(false));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="you@shop.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-primary text-xs font-medium hover:underline"
                    onClick={() => setStage("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(value) => setRememberMeState(value === true)}
                />
                <Label htmlFor="remember-me" className="text-sm font-normal">
                  Remember me
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="text-muted-foreground mt-8 text-center text-sm">
              New to InuaBiz?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthSplit>
  );
}
