/**
 * Onboarding draft persistence — lets a vendor refresh (or lose signal) and
 * resume exactly where they left off. Never stores the SMS code.
 */

export type OnboardingDraft = {
  step: number;
  phone: string;
  otpSent: boolean;
  business: string;
  category: string;
  payType: string;
  payValue: string;
  coords: { lat: number; lng: number } | null;
  startedAt: number;
  updatedAt: number;
};

const KEY = "inuabiz.onboarding.draft";
/** Drafts older than 7 days are treated as stale. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
    return {
      step: Math.min(Math.max(draft.step, 0), 3),
      phone: draft.phone ?? "",
      otpSent: draft.otpSent ?? false,
      business: draft.business ?? "",
      category: draft.category ?? "Duka",
      payType: draft.payType ?? "personal",
      payValue: draft.payValue ?? "",
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
