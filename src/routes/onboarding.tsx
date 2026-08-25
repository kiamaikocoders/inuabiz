import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  MapPin,
  PartyPopper,
  RotateCcw,
  Smartphone,
  Store,
  Wallet,
  WifiOff,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/brand/Logo";
import { OnboardingHelpDialog } from "@/components/app/OnboardingHelpDialog";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/mock-data";
import { completeOnboarding, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth";
import { to254 } from "@/lib/phone";
import { useNetworkOnline } from "@/lib/network";
import { trackExposure } from "@/lib/experiments";
import {
  trackConnectivity,
  trackOnboardingAbandoned,
  trackOnboardingCompleted,
  trackOnboardingResumed,
  trackOnboardingStart,
  trackStepBack,
  trackStepCompleted,
  trackStepViewed,
  trackSummaryEmail,
  trackValidationFailed,
} from "@/lib/analytics";
import { clearDraft, hasMeaningfulProgress, loadDraft, saveDraft } from "@/lib/onboarding-progress";

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

/** Guided A/B variant: one concrete tip per step. */
const stepTips = [
  "Use the number you keep on you all day — the login code and M-Pesa alerts land there.",
  "Name your shop exactly as customers know it; it prints on every receipt.",
  "Not sure? Start with your personal M-Pesa number — you can add a Till later.",
  "Check the summary once, then we'll load a sample product so you can test a sale.",
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
  const [resumed, setResumed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [variant, setVariant] = useState<"control" | "guided">("control");
  const [wasOffline, setWasOffline] = useState(false);
  const [emailCopy, setEmailCopy] = useState(false);
  const [summaryEmail, setSummaryEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { online, retry } = useNetworkOnline();



  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  const stepEnteredAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);
  const stepRef = useRef(0);
  stepRef.current = step;

  const provisioning = provisionIndex >= 0;

  const destType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" =
    payType === "till" ? "TILL" : payType === "paybill" ? "PAYBILL" : "PERSONAL_MPESA";

  /* -------- resume a saved draft on first paint -------- */
  useEffect(() => {
    const draft = loadDraft();
    if (draft && hasMeaningfulProgress(draft)) {
      setStep(draft.step);
      setPhone(draft.phone);
      setOtpSent(draft.otpSent);
      setBusiness(draft.business);
      setCategory(draft.category);
      setPayType(draft.payType);
      setPayValue(draft.payValue);
      setCoords(draft.coords);
      setLocated(draft.coords != null);
      setResumed(true);
      startedAtRef.current = draft.startedAt;
      trackOnboardingResumed(draft.step);
      trackStepViewed(draft.step, { resumed: true });
    } else {
      trackOnboardingStart();
      trackStepViewed(0, { resumed: false });
    }
    setVariant(trackExposure("onboarding_copy", "onboarding_flow"));
    setHydrated(true);
  }, []);

  /* -------- connectivity: keep the draft safe across signal drops -------- */
  useEffect(() => {
    if (!hydrated) return;
    if (!online) {
      setWasOffline(true);
      trackConnectivity("offline", stepRef.current);
      setAnnouncement("You are offline. Your progress is saved and you can continue when back.");
      return;
    }
    if (wasOffline) {
      trackConnectivity("online", stepRef.current);
      setAnnouncement("Back online. You can continue where you left off.");
      toast.success("Back online", { description: "Your onboarding progress was kept safe." });
      setWasOffline(false);
    }
  }, [online, hydrated, wasOffline]);

  /* -------- persist progress on every meaningful change -------- */
  useEffect(() => {
    if (!hydrated || finishedRef.current) return;
    saveDraft({
      step,
      phone,
      otpSent,
      business,
      category,
      payType,
      payValue,
      coords,
      startedAt: startedAtRef.current,
    });
  }, [hydrated, step, phone, otpSent, business, category, payType, payValue, coords]);

  /* -------- funnel drop-off -------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => {
      if (finishedRef.current || document.visibilityState !== "hidden") return;
      trackOnboardingAbandoned(stepRef.current, "page_hidden", Date.now() - startedAtRef.current);
    };
    const onUnload = () => {
      if (finishedRef.current) return;
      trackOnboardingAbandoned(stepRef.current, "unload", Date.now() - startedAtRef.current);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onUnload);
      if (!finishedRef.current) {
        trackOnboardingAbandoned(
          stepRef.current,
          "navigated_away",
          Date.now() - startedAtRef.current,
        );
      }
    };
  }, []);

  /* -------- focus management + screen-reader step announcements -------- */
  useEffect(() => {
    if (!hydrated) return;
    stepEnteredAtRef.current = Date.now();
    setAnnouncement(`Step ${step + 1} of 4: ${stepMeta[step]!.title}`);
    const t = window.setTimeout(() => headingRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [step, hydrated]);

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
    const fields = Object.keys(found);
    if (fields.length > 0) {
      trackValidationFailed(target, fields);
      window.setTimeout(() => errorSummaryRef.current?.focus(), 40);
      return false;
    }
    return true;
  };

  const next = () => {
    trackStepCompleted(stepRef.current, Date.now() - stepEnteredAtRef.current);
    setStep((s) => {
      const target = Math.min(s + 1, 3);
      trackStepViewed(target);
      return target;
    });
  };

  const back = () => {
    setErrors({});
    setStep((s) => {
      const target = Math.max(s - 1, 0);
      if (target !== s) trackStepBack(s, target);
      return target;
    });
  };

  const restart = () => {
    clearDraft();
    setStep(0);
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setBusiness("");
    setCategory("Duka");
    setPayType("personal");
    setPayValue("");
    setCoords(null);
    setLocated(false);
    setErrors({});
    setResumed(false);
    startedAtRef.current = Date.now();
    trackOnboardingStart({ restarted: true });
    toast.info("Started a fresh setup");
  };

  const sendCode = () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) {
      setError("phone", p.error.issues[0]!.message);
      trackValidationFailed(0, ["phone"]);
      window.setTimeout(() => errorSummaryRef.current?.focus(), 40);
      return;
    }
    setBusy(true);
    void sendPhoneOtp(phone)
      .then((sent) => {
        setOtpSent(true);
        toast.info(sent.demo ? "Demo code sent" : "Code sent", {
          description: sent.demo ? "Enter any 4 digits, then Continue." : `SMS sent to ${phone}`,
        });
        setAnnouncement("Verification code sent. Enter the four digit code.");
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

  const finish = useCallback(() => {
    if (emailCopy && !z.string().email().safeParse(summaryEmail).success) {
      setErrors({ summaryEmail: "Enter a valid email address for your summary" });
      trackSummaryEmail("failed", { reason: "invalid_email" });
      window.setTimeout(() => errorSummaryRef.current?.focus(), 40);
      return;
    }
    setErrors({});
    setBusy(true);
    setProvisionIndex(0);
    trackStepCompleted(3, Date.now() - stepEnteredAtRef.current);
    trackOnboardingCompleted(Date.now() - startedAtRef.current, {
      category,
      destination_type: destType,
      located,
      summary_email: emailCopy,
    });
    if (emailCopy) {
      setEmailSent(true);
      trackSummaryEmail("sent", { domain: summaryEmail.split("@")[1] ?? "" });
      toast.success("Summary on the way", { description: `We'll email ${summaryEmail}.` });
    }
    finishedRef.current = true;
    clearDraft();
    setAnnouncement("Setting up your shop. This takes a few seconds.");
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
  }, [
    business,
    category,
    coords,
    destType,
    emailCopy,
    located,
    payValue,
    phone,
    summaryEmail,
  ]);

  const errorList = Object.entries(errors);

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
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {resumed && !provisioning && (
          <div className="border-primary/40 bg-primary-soft mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <p className="text-primary text-sm font-medium">
              We saved your progress — you're back on step {step + 1} of 4.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={restart}>
              <RotateCcw className="mr-1.5 size-3.5" /> Start over
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            Step {step + 1} of 4 · {stepMeta[step]!.time}
          </span>
          <span className="text-primary">{TRIAL_DAYS}-day free trial</span>
        </div>
        <Progress
          value={((step + 1) / 4) * 100}
          className="mt-3 h-1.5"
          aria-label={`Onboarding progress: step ${step + 1} of 4`}
        />

        <ol className="mt-8 hidden gap-2 sm:grid sm:grid-cols-4">
          {stepMeta.map((s, i) => (
            <li
              key={s.title}
              aria-current={i === step ? "step" : undefined}
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
            </li>
          ))}
        </ol>

        {!online && (
          <div
            role="status"
            className="border-warning/40 bg-warning/10 mt-6 flex flex-wrap items-center gap-3 rounded-xl border p-4"
          >
            <WifiOff className="text-warning size-4 shrink-0" />
            <p className="min-w-0 flex-1 text-xs leading-relaxed">
              <span className="font-semibold">You're offline.</span> Everything you've typed is
              saved — keep this page open and continue as soon as the signal returns.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                trackConnectivity("retry_clicked", step);
                void retry().then((ok) => {
                  if (!ok) toast.error("Still offline", { description: "Your progress is safe." });
                });
              }}
            >
              <RotateCcw className="mr-1.5 size-3.5" /> Check again
            </Button>
          </div>
        )}

        <div className="surface-card mt-6 p-6 sm:p-8">
          {variant === "guided" && !provisioning && (
            <p className="border-primary/30 bg-primary-soft text-primary mb-6 rounded-xl border px-4 py-3 text-xs leading-relaxed">
              <span className="font-semibold">Tip:</span> {stepTips[step]}
            </p>
          )}
          {errorList.length > 0 && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="onboarding-error-title"
              className="border-destructive/40 bg-destructive/10 mb-6 rounded-xl border p-4"
            >
              <p
                id="onboarding-error-title"
                className="text-destructive flex items-center gap-2 text-sm font-semibold"
              >
                <AlertCircle className="size-4 shrink-0" />
                {errorList.length === 1
                  ? "Fix 1 field to continue"
                  : `Fix ${errorList.length} fields to continue`}
              </p>
              <ul className="text-destructive mt-2 list-disc space-y-1 pl-8 text-xs">
                {errorList.map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {step === 0 && (
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                Let's start with your number
              </h1>

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
                    aria-describedby={errors["phone"] ? "ph-error" : undefined}
                    autoComplete="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError("phone");
                    }}
                  />
                  <FieldError id="ph-error" message={errors["phone"]} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp-input">SMS code</Label>
                  <InputOTP
                    id="otp-input"
                    aria-label="Four digit SMS verification code"
                    aria-invalid={Boolean(errors["otp"])}
                    aria-describedby={errors["otp"] ? "otp-error otp-hint" : "otp-hint"}
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
                  <FieldError id="otp-error" message={errors["otp"]} />
                  <p id="otp-hint" className="text-muted-foreground text-xs">
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
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                Tell us about your business
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Your location powers the store map and regional insights. Nothing is shown publicly.
              </p>
              <div className="mt-7 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bn">Business name</Label>
                  <Input
                    id="bn"
                    aria-invalid={Boolean(errors["business"])}
                    aria-describedby={errors["business"] ? "bn-error" : undefined}
                    autoComplete="organization"
                    placeholder="Njoroge Mini Mart"
                    value={business}
                    maxLength={60}
                    onChange={(e) => {
                      setBusiness(e.target.value);
                      setError("business");
                    }}
                  />
                  <FieldError id="bn-error" message={errors["business"]} />
                </div>
                <div className="space-y-2">
                  <span id="cat-label" className="text-sm font-medium">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="cat-label">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={category === c}
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
                    aria-describedby={errors["location"] ? "loc-error" : undefined}
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
                  <FieldError id="loc-error" message={errors["location"]} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                Where should money land?
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Pick whatever you already use today. You can add more channels later.
              </p>
              <RadioGroup
                value={payType}
                onValueChange={(v) => {
                  setPayType(v);
                  setError("payValue");
                }}
                className="mt-7 space-y-3"
              >
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
                  aria-describedby={errors["payValue"] ? "pv-error" : undefined}
                  placeholder={payType === "personal" ? "0712 345 678" : "123456"}
                  value={payValue}
                  onChange={(e) => {
                    setPayValue(e.target.value);
                    setError("payValue");
                  }}
                />
                <FieldError id="pv-error" message={errors["payValue"]} />
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
              <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">
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
                <>
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

                  <div className="border-border mx-auto mt-4 max-w-md rounded-xl border p-4 text-left">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="email-copy"
                        checked={emailCopy}
                        onCheckedChange={(checked) => {
                          const on = checked === true;
                          setEmailCopy(on);
                          if (on) trackSummaryEmail("requested", { step_id: "review_and_finish" });
                          else trackSummaryEmail("skipped");
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="email-copy" className="text-sm font-semibold">
                          Email me a copy of my setup and next steps
                        </Label>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          Your shop details, trial end date and a short checklist for your first
                          sale.
                        </p>
                        {emailCopy && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor="summary-email" className="text-xs">
                              Email address
                            </Label>
                            <Input
                              id="summary-email"
                              type="email"
                              inputMode="email"
                              placeholder="you@duka.co.ke"
                              value={summaryEmail}
                              onChange={(e) => setSummaryEmail(e.target.value)}
                              aria-invalid={Boolean(errors["summaryEmail"])}
                              aria-describedby={
                                errors["summaryEmail"] ? "summary-email-error" : undefined
                              }
                            />
                            <FieldError
                              id="summary-email-error"
                              message={errors["summaryEmail"]}
                            />
                            {emailSent && (
                              <p className="text-success flex items-center gap-1.5 text-xs font-medium">
                                <Mail className="size-3.5" /> Summary queued to {summaryEmail}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={back} disabled={step === 0 || busy || provisioning}>
                Back
              </Button>
              <OnboardingHelpDialog step={step} />
            </div>
            {step === 0 && !otpSent ? (
              <Button onClick={sendCode} size="lg" disabled={busy || !online}>
                {busy ? "Sending…" : !online ? "Waiting for signal…" : "Send code"}
              </Button>
            ) : step < 3 ? (
              <Button onClick={continueStep} size="lg" disabled={busy}>
                {busy ? "Working…" : "Continue"}
              </Button>
            ) : (
              <Button size="lg" onClick={finish} disabled={busy || provisioning || !online}>
                {provisioning ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Setting up…
                  </>
                ) : !online ? (
                  "Waiting for signal…"
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

function FieldError({ id, message }: { id?: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-destructive flex items-center gap-1.5 text-xs font-medium"
    >
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}
