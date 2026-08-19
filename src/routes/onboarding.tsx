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

const phoneSchema = z
  .string()
  .trim()
  .nonempty({ message: "Enter your mobile number" })
  .refine((v) => /^2547\d{8}$|^2541\d{8}$/.test(to254(v)), {
    message: "Use a valid Safaricom/Airtel number, e.g. 0712 345 678",
  });

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, { message: "Enter the 4-digit code from your SMS" });

const businessSchema = z
  .string()
  .trim()
  .nonempty({ message: "Give your shop a name" })
  .min(2, { message: "Name must be at least 2 characters" })
  .max(60, { message: "Keep the name under 60 characters" });

const tillSchema = z
  .string()
  .trim()
  .regex(/^\d{5,7}$/, { message: "Till/Paybill numbers are 5–7 digits" });

const provisioningSteps = [
  "Creating your shop workspace",
  "Linking your M-Pesa destination",
  "Loading starter products",
  "Starting your free trial",
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [business, setBusiness] = useState("");
  const [category, setCategory] = useState("Duka");
  const [located, setLocated] = useState(false);
  const [payType, setPayType] = useState("personal");
  const [payValue, setPayValue] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [provisionIndex, setProvisionIndex] = useState(-1);

  const provisioning = provisionIndex >= 0;

  const destType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" =
    payType === "till" ? "TILL" : payType === "paybill" ? "PAYBILL" : "PERSONAL_MPESA";

  const setError = (key: string, message?: string) =>
    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (message) nextErrors[key] = message;
      else delete nextErrors[key];
      return nextErrors;
    });

  const validateStep = (target: number): boolean => {
    const found: Record<string, string> = {};
    if (target === 0) {
      const p = phoneSchema.safeParse(phone);
      if (!p.success) found["phone"] = p.error.issues[0]!.message;
      const o = otpSchema.safeParse(otp);
      if (!o.success) found["otp"] = o.error.issues[0]!.message;
    }
    if (target === 1) {
      const b = businessSchema.safeParse(business);
      if (!b.success) found["business"] = b.error.issues[0]!.message;
      if (!located) found["location"] = "Pin your store location to continue";
    }
    if (target === 2) {
      if (payType === "personal") {
        const p = phoneSchema.safeParse(payValue);
        if (!p.success) found["payValue"] = p.error.issues[0]!.message;
      } else {
        const t = tillSchema.safeParse(payValue);
        if (!t.success) found["payValue"] = t.error.issues[0]!.message;
      }
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const sendCode = () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) {
      setError("phone", p.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    void sendPhoneOtp(phone)
      .then((sent) => {
        setOtpSent(true);
        toast.info(sent.demo ? "Demo code sent" : "Code sent", {
          description: sent.demo ? "Enter any 4 digits, then Continue." : `SMS sent to ${phone}`,
        });
      })
      .catch(() => {
        setOtpSent(true);
        toast.info("Demo code sent", { description: "Enter any 4 digits, then Continue." });
      })
      .finally(() => setBusy(false));
  };

  const continueStep = () => {
    if (!validateStep(step)) return;
    if (step !== 0) {
      next();
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await verifyPhoneOtp(phone, otp);
        next();
      } catch (err: unknown) {
        toast.error("Could not verify code", {
          description: err instanceof Error ? err.message : "Continuing in demo mode",
        });
        next();
      } finally {
        setBusy(false);
      }
    })();
  };

  // Mock provisioning: tick through the checklist, then open the vendor app home.
  useEffect(() => {
    if (!provisioning) return;
    if (provisionIndex >= provisioningSteps.length) {
      const done = window.setTimeout(() => {
        toast.success("Shop is live", { description: "Welcome to InuaBiz." });
        void navigate({ to: "/app" });
      }, 600);
      return () => window.clearTimeout(done);
    }
    const t = window.setTimeout(() => setProvisionIndex((i) => i + 1), 750);
    return () => window.clearTimeout(t);
  }, [provisioning, provisionIndex, navigate]);

  const finish = () => {
    setBusy(true);
    setProvisionIndex(0);
    void completeOnboarding({
      businessName: business,
      category,
      phone,
      destinationType: destType,
      accountNumber: payValue,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    }).catch(() => {
      /* demo mode — provisioning animation still completes */
    });
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
                    inputMode="tel"
                    aria-invalid={Boolean(errors["phone"])}
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError("phone");
                    }}
                  />
                  <FieldError message={errors["phone"]} />
                </div>
                <div className="space-y-2">
                  <Label>SMS code</Label>
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setError("otp");
                    }}
                  >
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <InputOTPSlot key={i} index={i} className="size-12 rounded-xl border" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <FieldError message={errors["otp"]} />
                  <p className="text-muted-foreground text-xs">
                    {otpSent
                      ? "Demo mode — enter any four digits."
                      : "Tap Send code and we'll SMS a four-digit code."}
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
                    aria-invalid={Boolean(errors["business"])}
                    placeholder="Njoroge Mini Mart"
                    value={business}
                    maxLength={60}
                    onChange={(e) => {
                      setBusiness(e.target.value);
                      setError("business");
                    }}
                  />
                  <FieldError message={errors["business"]} />
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
                            setError("location");
                            toast.success("Location pinned", {
                              description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                            });
                          },
                          () => {
                            setCoords({ lat: -1.2864, lng: 36.8172 });
                            setLocated(true);
                            setError("location");
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
                    {located && coords
                      ? `Location pinned · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                      : "Detect my location"}
                  </Button>
                  <FieldError message={errors["location"]} />
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
              <RadioGroup
                value={payType}
                onValueChange={(v) => {
                  setPayType(v);
                  setError("payValue");
                }} className="mt-7 space-y-3">
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
                  {payType === "personal"
                    ? "M-Pesa number"
                    : payType === "till"
                      ? "Till number"
                      : "Paybill number"}
                </Label>
                <Input
                  id="pv"
                  inputMode="numeric"
                  aria-invalid={Boolean(errors["payValue"])}
                  placeholder={payType === "personal" ? "0712 345 678" : "123456"}
                  value={payValue}
                  onChange={(e) => {
                    setPayValue(e.target.value);
                    setError("payValue");
                  }}
                />
                <FieldError message={errors["payValue"]} />
              </div>

            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <span
                className={cn(
                  "mx-auto grid size-14 place-items-center rounded-2xl",
                  provisioning ? "bg-primary-soft text-primary" : "bg-success/15 text-success",
                )}
              >
                {provisioning ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <PartyPopper className="size-7" />
                )}
              </span>
              <h1 className="mt-5 text-2xl font-bold">
                {provisioning ? "Setting up your shop…" : `${business} is ready to go live`}
              </h1>
              <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
                {provisioning
                  ? "This takes a few seconds. Keep this page open."
                  : `Confirm the details below and we'll start your ${TRIAL_DAYS}-day full-access trial with a sample product loaded.`}
              </p>

              {provisioning ? (
                <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
                  {provisioningSteps.map((label, i) => {
                    const done = i < provisionIndex;
                    const active = i === provisionIndex;
                    return (
                      <li
                        key={label}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                          done
                            ? "border-success/40 bg-success/10"
                            : active
                              ? "border-primary bg-primary-soft"
                              : "border-border bg-card opacity-60",
                        )}
                      >
                        {done ? (
                          <Check className="text-success size-4 shrink-0" />
                        ) : active ? (
                          <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
                        ) : (
                          <span className="border-border size-4 shrink-0 rounded-full border" />
                        )}
                        <span className={cn(done && "text-success")}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bg-muted mx-auto mt-6 grid max-w-md gap-2 rounded-xl p-4 text-left text-sm">
                  {[
                    ["Business", business],
                    ["Category", category],
                    ["Phone", phone],
                    ["Payments to", `${payType} · ${payValue}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="truncate font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={step === 0 || busy || provisioning}>
              Back
            </Button>
            {step === 0 && !otpSent ? (
              <Button onClick={sendCode} size="lg" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            ) : step < 3 ? (
              <Button onClick={continueStep} size="lg" disabled={busy}>
                {busy ? "Working…" : "Continue"}
              </Button>
            ) : (
              <Button size="lg" onClick={finish} disabled={busy || provisioning}>
                {provisioning ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Setting up…
                  </>
                ) : (
                  "Go to my dashboard"
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p className="text-destructive flex items-center gap-1.5 text-xs font-medium">
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

