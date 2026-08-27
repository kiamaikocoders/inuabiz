/**
 * Onboarding draft persistence — lets a vendor refresh (or lose signal) and
 * resume exactly where they left off. Never stores the SMS code.
 */

export type OnboardingPayChannelId = "personal" | "till" | "paybill";

export type OnboardingPayChannels = Record<
  OnboardingPayChannelId,
  { enabled: boolean; value: string }
>;

export type OnboardingDraft = {
  step: number;
  phone: string;
  otpSent: boolean;
  business: string;
  category: string;
  /** @deprecated kept for older drafts */
  payType?: string;
  /** @deprecated kept for older drafts */
  payValue?: string;
  payChannels: OnboardingPayChannels;
  primaryPayChannel: OnboardingPayChannelId;
  planCode: "SHOP_MONTHLY" | "COMPLIANCE";
  coords: { lat: number; lng: number } | null;
  startedAt: number;
  updatedAt: number;
};

const KEY = "inuabiz.onboarding.draft";
/** Drafts older than 7 days are treated as stale. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const defaultPayChannels = (): OnboardingPayChannels => ({
  personal: { enabled: true, value: "" },
  till: { enabled: false, value: "" },
  paybill: { enabled: false, value: "" },
});

function normalizeChannels(
  draft: Partial<OnboardingDraft>,
): { channels: OnboardingPayChannels; primary: OnboardingPayChannelId } {
  const base = defaultPayChannels();
  if (draft.payChannels) {
    for (const id of ["personal", "till", "paybill"] as const) {
      const row = draft.payChannels[id];
      if (row) {
        base[id] = {
          enabled: Boolean(row.enabled),
          value: String(row.value ?? ""),
        };
      }
    }
  } else if (draft.payType || draft.payValue) {
    // Migrate older single-channel drafts.
    const id =
      draft.payType === "till" ? "till" : draft.payType === "paybill" ? "paybill" : "personal";
    base.personal.enabled = false;
    base[id] = { enabled: true, value: draft.payValue ?? "" };
    return { channels: base, primary: id };
  }

  const primary =
    draft.primaryPayChannel === "till" || draft.primaryPayChannel === "paybill"
      ? draft.primaryPayChannel
      : "personal";
  if (!base[primary].enabled) {
    const first = (["personal", "till", "paybill"] as const).find((id) => base[id].enabled);
    return { channels: base, primary: first ?? "personal" };
  }
  return { channels: base, primary };
}

export function loadDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (typeof draft.step !== "number") return null;
    if (!draft.updatedAt || Date.now() - draft.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    const plan = draft.planCode === "COMPLIANCE" ? "COMPLIANCE" : "SHOP_MONTHLY";
    const { channels, primary } = normalizeChannels(draft);
    return {
      step: Math.min(Math.max(draft.step, 0), 3),
      phone: draft.phone ?? "",
      otpSent: draft.otpSent ?? false,
      business: draft.business ?? "",
      category: draft.category ?? "DUKA",
      payChannels: channels,
      primaryPayChannel: primary,
      planCode: plan,
      coords: draft.coords ?? null,
      startedAt: draft.startedAt ?? Date.now(),
      updatedAt: draft.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<OnboardingDraft, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function hasMeaningfulProgress(draft: OnboardingDraft | null): boolean {
  if (!draft) return false;
  return draft.step > 0 || draft.phone.length > 0 || draft.business.length > 0;
}
