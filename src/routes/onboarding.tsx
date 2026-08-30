import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  MapPin,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OnboardingHelpDialog } from "@/components/app/OnboardingHelpDialog";
import { ShopLogoPicker } from "@/components/app/ShopLogoPicker";
import { OnboardingSplit } from "@/components/auth/OnboardingSplit";
import { CategoryPicker } from "@/components/category/CategoryPicker";
import { categoryLabel, parseCategory } from "@/lib/category";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS, KES, SUBSCRIPTION_PRICE, COMPLIANCE_PRICE } from "@/lib/mock-data";
import { completeOnboarding, fetchProfile, sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth";
import { uploadBusinessLogo } from "@/lib/business-logo";
import { reverseGeocode } from "@/lib/geo";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchPublicPricing } from "@/lib/plans";
import { to254 } from "@/lib/phone";
import { useNetworkOnline } from "@/lib/network";
import { trackExposure } from "@/lib/experiments";
import { useQuery } from "@tanstack/react-query";
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
import { clearDraft, defaultPayChannels, hasMeaningfulProgress, loadDraft, saveDraft, type OnboardingPayChannelId, type OnboardingPayChannels } from "@/lib/onboarding-progress";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () =>
    privateHead(
      "Start your free trial — InuaBiz",
      "Finish InuaBiz shop setup: category, location and M-Pesa destination.",
    ),
  component: Onboarding,
});

const payTypes = [
  { id: "personal" as const, label: "Personal M-Pesa number", hint: "Fastest to start — no registration", dest: "PERSONAL_MPESA" as const },
  { id: "till" as const, label: "Buy Goods Till number", hint: "Best for busy counters", dest: "TILL" as const },
  { id: "paybill" as const, label: "Paybill number", hint: "Best for account-based payments", dest: "PAYBILL" as const },
];

/** Guided A/B variant: one concrete tip per step. */
const stepTips = [
  "Use the number you keep on you all day — the login code and M-Pesa alerts land there.",
  "Name your shop exactly as customers know it; it prints on every receipt.",
  "A shopfront or till photo helps staff recognise the shop. Skip it if you are in a hurry.",
  "Tick every channel you already use — Till, Paybill and personal can all be on.",
  "Most shops stay on Standard. Pick Compliance only if you need ETR / KRA records.",
];

const LAST_STEP = 4;

const stepMeta = [
  { title: "M-Pesa number", time: "30 seconds" },
  { title: "Business details", time: "45 seconds" },
  { title: "Shop photo", time: "20 seconds" },
  { title: "Payment channels", time: "45 seconds" },
  { title: "Choose your plan", time: "20 seconds" },
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
  "Saving your plan",
  "Opening your till",
  "Starting your free trial",
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [business, setBusiness] = useState("");
  const [category, setCategory] = useState("DUKA");
  const [located, setLocated] = useState(false);
  const [payChannels, setPayChannels] = useState<OnboardingPayChannels>(() => defaultPayChannels());
  const [primaryPayChannel, setPrimaryPayChannel] = useState<OnboardingPayChannelId>("personal");
  const [planCode, setPlanCode] = useState<"SHOP_MONTHLY" | "COMPLIANCE">("SHOP_MONTHLY");
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
  const [accountReady, setAccountReady] = useState(!isSupabaseConfigured());
  const [ownerName, setOwnerName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { online, retry } = useNetworkOnline();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  const stepEnteredAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);
  const stepRef = useRef(0);
  const logoPreviewRef = useRef<string | null>(null);
  stepRef.current = step;
  logoPreviewRef.current = logoPreview;

  useEffect(() => {
    return () => {
      if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    };
  }, []);

  const provisioning = provisionIndex >= 0;

  const enabledDestinations = payTypes
    .filter((p) => payChannels[p.id].enabled)
    .map((p) => ({
      type: p.dest,
      accountNumber: payChannels[p.id].value,
      isPrimary: primaryPayChannel === p.id,
    }));
  const primaryMeta = payTypes.find((p) => p.id === primaryPayChannel) ?? payTypes[0]!;
  const destType = primaryMeta.dest;
  const primaryAccount = payChannels[primaryPayChannel]?.value ?? "";

  const { data: pricing } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPublicPricing,
  });
  const standardPrice = pricing?.shopMonthly ?? SUBSCRIPTION_PRICE;
  const compliancePrice = pricing?.compliance ?? COMPLIANCE_PRICE;
  const trialDays = pricing?.trialDays ?? TRIAL_DAYS;

  /* -------- must have a verified account; unfinished onboarding stays here -------- */
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const pending =
        typeof window !== "undefined" ? sessionStorage.getItem("inuabiz:pendingShop") : null;
      if (pending) setBusiness(pending);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      void navigate({ to: "/signup" });
      return;
    }

    let cancelled = false;

    const resolveSession = async () => {
      const urlLooksLikeAuthReturn =
        typeof window !== "undefined" &&
        (window.location.hash.includes("access_token") ||
          new URLSearchParams(window.location.search).has("code"));

      let session = (await sb.auth.getSession()).data.session;
      if (!session && urlLooksLikeAuthReturn) {
        for (let i = 0; i < 20 && !session && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 150));
          session = (await sb.auth.getSession()).data.session;
        }
      }
      if (cancelled) return;

      if (!session) {
        void navigate({ to: "/signup" });
        return;
      }

      const profile = await fetchProfile();
      if (cancelled) return;
      if (profile?.tenant_id && profile.onboarding_completed_at) {
        void navigate({ to: "/app" });
        return;
      }
      setAccountReady(true);
      if (profile?.pending_shop_name) setBusiness(profile.pending_shop_name);
      if (profile?.full_name) setOwnerName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
    };

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  useEffect(() => {
    const draft = loadDraft();
    if (draft && hasMeaningfulProgress(draft)) {
      setStep(draft.step);
      setPhone(draft.phone);
      setOtpSent(draft.otpSent);
      setBusiness(draft.business);
      setCategory(parseCategory(draft.category));
      setPayChannels(draft.payChannels);
      setPrimaryPayChannel(draft.primaryPayChannel);
      setPlanCode(draft.planCode === "COMPLIANCE" ? "COMPLIANCE" : "SHOP_MONTHLY");
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
      payChannels,
      primaryPayChannel,
      planCode,
      coords,
      startedAt: startedAtRef.current,
    });
  }, [hydrated, step, phone, otpSent, business, category, payChannels, primaryPayChannel, planCode, coords]);

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
    setAnnouncement(`Step ${step + 1} of ${LAST_STEP + 1}: ${stepMeta[step]!.title}`);
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
      if (!accountReady) {
        const o = otpSchema.safeParse(otp);
        if (!o.success) found["otp"] = o.error.issues[0]!.message;
      }
    }
    if (target === 1) {
      const b = businessSchema.safeParse(business);
      if (!b.success) found["business"] = b.error.issues[0]!.message;
      if (!located) found["location"] = "Pin your store location to continue";
    }
    if (target === 3) {
      const enabled = payTypes.filter((p) => payChannels[p.id].enabled);
      if (enabled.length === 0) {
        found["payChannels"] = "Add at least one payment channel";
      } else {
        for (const p of enabled) {
          const value = payChannels[p.id].value;
          if (p.id === "personal") {
            const parsed = phoneSchema.safeParse(value);
            if (!parsed.success) found[`pay_${p.id}`] = parsed.error.issues[0]!.message;
          } else {
            const parsed = tillSchema.safeParse(value);
            if (!parsed.success) found[`pay_${p.id}`] = parsed.error.issues[0]!.message;
          }
        }
        if (!payChannels[primaryPayChannel].enabled) {
          found["primaryPay"] = "Pick a primary channel from the ones you enabled";
        }
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
      const target = Math.min(s + 1, LAST_STEP);
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
    setPayChannels(defaultPayChannels());
    setPrimaryPayChannel("personal");
    setPlanCode("SHOP_MONTHLY");
    setCoords(null);
    setLocated(false);
    setLogoFile(null);
    setLogoPreview(null);
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
    if (accountReady) {
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
    trackStepCompleted(LAST_STEP, Date.now() - stepEnteredAtRef.current);
    trackOnboardingCompleted(Date.now() - startedAtRef.current, {
      category,
      destination_type: destType,
      destinations: enabledDestinations.map((d) => d.type),
      located,
      summary_email: emailCopy,
      plan_code: planCode,
    });
    if (emailCopy) {
      setEmailSent(true);
      trackSummaryEmail("sent", { domain: summaryEmail.split("@")[1] ?? "" });
      toast.success("Summary on the way", { description: `We'll email ${summaryEmail}.` });
    }
    finishedRef.current = true;
    clearDraft();
    setAnnouncement("Setting up your shop. This takes a few seconds.");
    void (async () => {
      let addressText: string | undefined;
      if (coords) {
        try {
          addressText = await reverseGeocode(coords);
        } catch {
          addressText = undefined;
        }
      }
      await completeOnboarding({
        businessName: business,
        category: parseCategory(category),
        phone,
        destinationType: destType,
        accountNumber: primaryAccount,
        destinations: enabledDestinations,
        planCode,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(addressText ? { addressText } : {}),
        ...(ownerName ? { fullName: ownerName } : {}),
      });
      if (logoFile) {
        try {
          await uploadBusinessLogo(logoFile, { alsoSetAvatar: true });
        } catch (err: unknown) {
          toast.error("Shop photo skipped", {
            description:
              err instanceof Error
                ? `${err.message} You can add it later in Settings.`
                : "You can add it later in Settings.",
          });
        }
      }
      setProvisionIndex(0);
    })().catch((err: unknown) => {
      finishedRef.current = false;
      setBusy(false);
      setProvisionIndex(-1);
      toast.error("Could not finish setup", {
        description: err instanceof Error ? err.message : "Stay on this page and retry.",
      });
    });
  }, [
    business,
    category,
    coords,
    destType,
    emailCopy,
    enabledDestinations,
    located,
    logoFile,
    ownerName,
    phone,
    planCode,
    primaryAccount,
    summaryEmail,
  ]);

  const errorList = Object.entries(errors);

  return (
    <OnboardingSplit step={step}>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {resumed && !provisioning && (
        <div className="border-primary/40 bg-primary-soft mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <p className="text-primary text-sm font-medium">
            We saved your progress — you're back on step {step + 1} of {LAST_STEP + 1}.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={restart}>
            <RotateCcw className="mr-1.5 size-3.5" /> Start over
          </Button>
        </div>
      )}

      <div className="mb-6 hidden items-center justify-between text-xs font-medium lg:flex">
        <span className="text-muted-foreground">{stepMeta[step]!.time}</span>
        <span className="text-primary">{trialDays}-day free trial</span>
      </div>

      {!online && (
          <div
            role="status"
            className="border-warning/40 bg-warning/10 mb-6 flex flex-wrap items-center gap-3 rounded-xl border p-4"
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

        <div>
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
                {accountReady ? "M-Pesa number for this shop" : "Let's start with your number"}
              </h1>

              <p className="text-muted-foreground mt-2 text-sm">
                {accountReady
                  ? "Subscription and customer STK prompts go to this Kenyan mobile number."
                  : "This is how you'll sign in and where subscription prompts will arrive."}
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
                {!accountReady && (
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
                      ? "Enter the four-digit code, then Continue."
                      : "Tap Send code and we'll SMS a four-digit code."}
                  </p>
                </div>
                )}
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
                    placeholder="Your shop name"
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
                  <p className="text-muted-foreground text-xs">
                    This shapes the till, inventory fields and extra screens for this shop. You can
                    change it later in Settings.
                  </p>
                  <CategoryPicker compact value={parseCategory(category)} onChange={setCategory} />
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
                Add a shop photo
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Optional. A till or shopfront shot helps staff recognise this shop. Skip and add it
                later from Settings.
              </p>
              <div className="mt-7">
                <ShopLogoPicker
                  url={logoPreview}
                  name={business || "Shop"}
                  onFile={(file) => {
                    setLogoFile(file);
                    setLogoPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(file);
                    });
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                Where should money land?
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Tick every channel you already use. Mark one as primary for checkout prompts — the
                rest still reconcile when customers pay there.
              </p>
              <FieldError message={errors["payChannels"] || errors["primaryPay"]} />
              <RadioGroup
                value={primaryPayChannel}
                onValueChange={(v) => {
                  setPrimaryPayChannel(v as OnboardingPayChannelId);
                  setError("primaryPay");
                }}
                className="mt-7 space-y-3"
              >
                {payTypes.map((p) => {
                  const row = payChannels[p.id];
                  const fieldError = errors[`pay_${p.id}`];
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        row.enabled ? "border-primary bg-primary-soft/40" : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`pay-enable-${p.id}`}
                          checked={row.enabled}
                          className="mt-0.5"
                          onCheckedChange={(checked) => {
                            const on = checked === true;
                            setPayChannels((prev) => {
                              const next = {
                                ...prev,
                                [p.id]: { ...prev[p.id], enabled: on },
                              };
                              if (!on && primaryPayChannel === p.id) {
                                const fallback = payTypes.find(
                                  (x) => x.id !== p.id && next[x.id].enabled,
                                );
                                if (fallback) setPrimaryPayChannel(fallback.id);
                              }
                              if (on && !payTypes.some((x) => x.id !== p.id && prev[x.id].enabled)) {
                                setPrimaryPayChannel(p.id);
                              }
                              return next;
                            });
                            setError("payChannels");
                            setError(`pay_${p.id}`);
                            setError("primaryPay");
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <Label htmlFor={`pay-enable-${p.id}`} className="text-sm font-semibold">
                            {p.label}
                          </Label>
                          <p className="text-muted-foreground text-xs">{p.hint}</p>
                          {row.enabled && (
                            <div className="mt-3 space-y-3">
                              <div className="space-y-1.5">
                                <Label htmlFor={`pay-value-${p.id}`} className="text-xs">
                                  {p.id === "personal"
                                    ? "M-Pesa number"
                                    : p.id === "till"
                                      ? "Till number"
                                      : "Paybill number"}
                                </Label>
                                <Input
                                  id={`pay-value-${p.id}`}
                                  inputMode="numeric"
                                  aria-invalid={Boolean(fieldError)}
                                  placeholder={p.id === "personal" ? "0712 345 678" : "123456"}
                                  value={row.value}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPayChannels((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], value },
                                    }));
                                    setError(`pay_${p.id}`);
                                  }}
                                />
                                <FieldError message={fieldError} />
                              </div>
                              <label
                                htmlFor={`pay-primary-${p.id}`}
                                className="flex cursor-pointer items-center gap-2 text-xs font-medium"
                              >
                                <RadioGroupItem value={p.id} id={`pay-primary-${p.id}`} />
                                Use as primary for checkout
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {step === LAST_STEP && (
            <div>
              {provisioning ? (
                <>
                  <span className="bg-primary-soft text-primary grid size-14 place-items-center rounded-2xl">
                    <Loader2 className="size-7 animate-spin" />
                  </span>
                  <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">
                    Setting up your shop…
                  </h1>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    This takes a few seconds. Keep this page open.
                  </p>
                  <ul className="mt-6 grid gap-2 text-sm">
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
                </>
              ) : (
                <>
                  <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
                    Choose your plan
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Default is Standard. Pick Compliance if you need ETR / KRA-ready records. Your{" "}
                    {trialDays}-day trial uses this plan from day one.
                  </p>

                  <RadioGroup
                    value={planCode}
                    onValueChange={(v) =>
                      setPlanCode(v === "COMPLIANCE" ? "COMPLIANCE" : "SHOP_MONTHLY")
                    }
                    className="mt-6 space-y-3"
                  >
                    <label
                      htmlFor="plan-standard"
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        planCode === "SHOP_MONTHLY"
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card",
                      )}
                    >
                      <RadioGroupItem value="SHOP_MONTHLY" id="plan-standard" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Standard</p>
                          <p className="font-display text-sm font-bold">
                            {KES(standardPrice)}
                            <span className="text-muted-foreground font-sans text-xs font-normal">
                              {" "}
                              / shop / month
                            </span>
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          POS, M-Pesa match, credit ledger, extra shops. Recommended for most dukas.
                        </p>
                        <p className="text-primary mt-2 text-[11px] font-semibold tracking-wide uppercase">
                          Default
                        </p>
                      </div>
                    </label>

                    <label
                      htmlFor="plan-compliance"
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        planCode === "COMPLIANCE"
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card",
                      )}
                    >
                      <RadioGroupItem value="COMPLIANCE" id="plan-compliance" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Compliance (ETR)</p>
                          <p className="font-display text-sm font-bold">
                            {KES(compliancePrice)}
                            <span className="text-muted-foreground font-sans text-xs font-normal">
                              {" "}
                              / shop / month
                            </span>
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          Everything in Standard plus ETR on paid and credit sales for shops with a
                          KRA PIN.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>

                  <div className="bg-muted mt-5 grid gap-2 rounded-xl p-4 text-sm">
                    {[
                      ["Business", business],
                      ["Category", categoryLabel(category)],
                      ["Phone", phone],
                      ["Photo", logoFile ? "Added" : "Skipped"],
                      [
                        "Payments",
                        enabledDestinations
                          .map((d) => {
                            const label =
                              d.type === "TILL"
                                ? "Till"
                                : d.type === "PAYBILL"
                                  ? "Paybill"
                                  : "Personal";
                            return `${label} ${d.accountNumber}${d.isPrimary ? " · primary" : ""}`;
                          })
                          .join(" · "),
                      ],
                      [
                        "Plan",
                        planCode === "COMPLIANCE"
                          ? `Compliance · ${KES(compliancePrice)}`
                          : `Standard · ${KES(standardPrice)}`,
                      ],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="max-w-[60%] text-right font-medium break-words">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-border mt-4 rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="email-copy"
                        checked={emailCopy}
                        onCheckedChange={(checked) => {
                          const on = checked === true;
                          setEmailCopy(on);
                          if (on) trackSummaryEmail("requested", { step_id: "plan_choice" });
                          else trackSummaryEmail("skipped");
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="email-copy" className="text-sm font-semibold">
                          Email me a copy of my setup and next steps
                        </Label>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          Your shop details, plan, trial end date and a short checklist for your
                          first sale.
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
            {step === 0 && !otpSent && !accountReady ? (
              <Button onClick={sendCode} size="lg" disabled={busy || !online}>
                {busy ? "Sending…" : !online ? "Waiting for signal…" : "Send code"}
              </Button>
            ) : step < LAST_STEP ? (
              <div className="flex items-center gap-2">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={busy}
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return null;
                      });
                      next();
                    }}
                  >
                    Skip for now
                  </Button>
                )}
                <Button onClick={continueStep} size="lg" disabled={busy}>
                  {busy ? "Working…" : "Continue"}
                </Button>
              </div>
            ) : (
              <Button size="lg" onClick={finish} disabled={busy || provisioning || !online}>
                {provisioning ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Setting up…
                  </>
                ) : !online ? (
                  "Waiting for signal…"
                ) : (
                  "Start my trial"
                )}
              </Button>
            )}
          </div>
        </div>
    </OnboardingSplit>
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
