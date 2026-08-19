import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  PartyPopper,
  Smartphone,
  Store,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/mock-data";
import { completeOnboarding, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth";
import { to254 } from "@/lib/phone";


export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Start your free trial — InuaBiz onboarding in 2 minutes" },
      {
        name: "description",
        content:
          "Create your InuaBiz account in under two minutes: phone verification, business details with GPS pin, and your M-Pesa payment destination.",
      },
      { property: "og:title", content: "Start your InuaBiz free trial" },
      {
        property: "og:description",
        content: "Phone number, business name, payment destination. 14 days free, no paperwork.",
      },
    ],
  }),
  component: Onboarding,
});

const categories = ["Duka", "Boutique", "Chemist", "Hardware", "Eatery"];
const payTypes = [
  { id: "personal", label: "Personal M-Pesa number", hint: "Fastest to start — no registration" },
  { id: "till", label: "Buy Goods Till number", hint: "Best for busy counters" },
  { id: "paybill", label: "Paybill number", hint: "Best for account-based payments" },
];

const stepMeta = [
  { title: "Verify your phone", icon: Smartphone, time: "30 seconds" },
  { title: "Business details", icon: Store, time: "45 seconds" },
  { title: "Payment destination", icon: Wallet, time: "30 seconds" },
  { title: "You're ready", icon: PartyPopper, time: "15 seconds" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [business, setBusiness] = useState("");
  const [category, setCategory] = useState("Duka");
  const [located, setLocated] = useState(false);
  const [payType, setPayType] = useState("personal");
  const [payValue, setPayValue] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const destType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" =
    payType === "till" ? "TILL" : payType === "paybill" ? "PAYBILL" : "PERSONAL_MPESA";

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const continueStep = () => {
    if (step !== 0) {
      next();
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        if (otp.length < 4) {
          const sent = await sendPhoneOtp(phone);
          toast.info(sent.demo ? "Demo code 1234" : "Code sent", {
            description: sent.demo ? "Enter any 4 digits, then Continue." : `SMS sent to ${phone}`,
          });
          return;
        }
        await verifyPhoneOtp(phone, otp);
        next();
      } catch (err: unknown) {
        toast.error("Phone step failed", {
          description: err instanceof Error ? err.message : "Try again",
        });
        if (otp.length >= 4) next();
      } finally {
        setBusy(false);
      }
    })();
  };

  const finish = () => {
    setBusy(true);
    void completeOnboarding({
      businessName: business || "Njoroge Mini Mart",
      category,
      phone,
      destinationType: destType,
      accountNumber: payValue || phone,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    })
      .then(() => {
        toast.success("Shop is live", { description: "Opening your POS." });
        void navigate({ to: "/app/pos" });
      })
      .catch((err: unknown) => {
        toast.error("Could not finish onboarding", {
          description: err instanceof Error ? err.message : "Opening demo POS instead",
        });
        void navigate({ to: "/app/pos" });
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/login" className="text-muted-foreground text-sm hover:text-foreground">
            Already have an account?
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            Step {step + 1} of 4 · {stepMeta[step]!.time}
          </span>
          <span className="text-primary">{TRIAL_DAYS}-day free trial</span>
        </div>
        <Progress value={((step + 1) / 4) * 100} className="mt-3 h-1.5" />

        <div className="mt-8 hidden gap-2 sm:grid sm:grid-cols-4">
          {stepMeta.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                i === step
                  ? "border-primary bg-primary-soft"
                  : i < step
                    ? "border-success/40 bg-success/10"
                    : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                {i < step ? (
                  <Check className="text-success size-4" />
                ) : (
                  <s.icon
                    className={cn("size-4", i === step ? "text-primary" : "text-muted-foreground")}
                  />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    i === step ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card mt-6 p-6 sm:p-8">
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold">Let's start with your number</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                This is how you'll sign in and where subscription prompts will arrive.
              </p>
              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ph">Mobile number</Label>
                  <Input
                    id="ph"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMS code</Label>
                  <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <InputOTPSlot key={i} index={i} className="size-12 rounded-xl border" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-muted-foreground text-xs">
                    Demo mode — enter any four digits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold">Tell us about your business</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Your location powers the store map and regional insights. Nothing is shown publicly.
              </p>
              <div className="mt-7 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bn">Business name</Label>
                  <Input
                    id="bn"
                    placeholder="Njoroge Mini Mart"
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                          category === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Store location</Label>
                  <Button
                    type="button"
                    variant={located ? "secondary" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setLocated(true);
                            toast.success("Location pinned", {
                              description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                            });
                          },
                          () => {
                            setCoords({ lat: -1.2864, lng: 36.8172 });
                            setLocated(true);
                            toast.success("Location pinned", {
                              description: "Fallback pin near Nairobi CBD.",
                            });
                          },
                        );
                      } else {
                        setCoords({ lat: -1.2864, lng: 36.8172 });
                        setLocated(true);
                        toast.success("Location pinned", {
                          description: "Demo pin set near Nairobi CBD.",
                        });
                      }
                    }}
                  >
                    <MapPin className="mr-2 size-4" />
                    {located ? "Location pinned · -1.2864, 36.8172" : "Detect my location"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold">Where should money land?</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Pick whatever you already use today. You can add more channels later.
              </p>
              <RadioGroup value={payType} onValueChange={setPayType} className="mt-7 space-y-3">
                {payTypes.map((p) => (
                  <label
                    key={p.id}
                    htmlFor={p.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                      payType === p.id ? "border-primary bg-primary-soft" : "border-border bg-card",
                    )}
                  >
                    <RadioGroupItem value={p.id} id={p.id} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-muted-foreground text-xs">{p.hint}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
              <div className="mt-5 space-y-2">
                <Label htmlFor="pv">
                  {payType === "personal" ? "M-Pesa number" : payType === "till" ? "Till number" : "Paybill number"}
                </Label>
                <Input
                  id="pv"
                  placeholder={payType === "personal" ? "0712 345 678" : "123456"}
                  value={payValue}
                  onChange={(e) => setPayValue(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <span className="bg-success/15 text-success mx-auto grid size-14 place-items-center rounded-2xl">
                <PartyPopper className="size-7" />
              </span>
              <h1 className="mt-5 text-2xl font-bold">
                {business || "Your shop"} is live on InuaBiz
              </h1>
              <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
                Your {TRIAL_DAYS}-day full-access trial has started. We've pre-loaded a sample
                product so you can complete your first test checkout right away.
              </p>
              <div className="bg-muted mx-auto mt-6 grid max-w-md gap-2 rounded-xl p-4 text-left text-sm">
                {[
                  ["Business", business || "Njoroge Mini Mart"],
                  ["Category", category],
                  ["Phone", phone || "0712 345 678"],
                  ["Payments to", `${payType} · ${payValue || "0712 345 678"}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="truncate font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={continueStep} size="lg" disabled={busy}>
                {busy ? "Working…" : step === 0 && otp.length < 4 ? "Send code" : "Continue"}
              </Button>
            ) : (
              <Button size="lg" onClick={finish} disabled={busy}>
                {busy ? "Saving…" : "Go to my POS"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
