/**
 * Lightweight frontend analytics buffer.
 *
 * Events are kept in memory + localStorage and mirrored to `window.dataLayer`
 * so a real destination (GA4, PostHog, Segment) can be wired later without
 * touching product code.
 */

export type AnalyticsEvent = {
  name: string;
  ts: number;
  props: Record<string, unknown>;
};

const STORAGE_KEY = "inuabiz.analytics.events";
const SESSION_KEY = "inuabiz.analytics.session";
const MAX_EVENTS = 300;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function sessionId(): string {
  if (!isBrowser()) return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getEvents(): AnalyticsEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearEvents(): void {
  if (isBrowser()) localStorage.removeItem(STORAGE_KEY);
}

/** Props merged into every subsequent event (e.g. A/B variant assignments). */
let globalProps: Record<string, unknown> = {};

export function setGlobalProps(props: Record<string, unknown>): void {
  globalProps = { ...globalProps, ...props };
}

export function track(name: string, props: Record<string, unknown> = {}): void {
  if (!isBrowser()) return;
  const event: AnalyticsEvent = {
    name,
    ts: Date.now(),
    props: { ...globalProps, ...props, session_id: sessionId(), path: window.location.pathname },
  };
  try {
    const events = [...getEvents(), event].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* storage full or blocked — analytics must never break the UI */
  }
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event: name, ...event.props, ts: event.ts });
  if (import.meta.env.DEV) console.debug("[analytics]", name, event.props);
}

/* ---------------- Onboarding funnel helpers ---------------- */

export const ONBOARDING_STEPS = [
  "phone_verification",
  "business_details",
  "payment_destination",
  "plan_choice",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export function stepId(index: number): OnboardingStepId {
  return ONBOARDING_STEPS[Math.min(Math.max(index, 0), ONBOARDING_STEPS.length - 1)]!;
}

export function trackOnboardingStart(props: Record<string, unknown> = {}): void {
  track("onboarding_started", props);
}

export function trackStepViewed(index: number, props: Record<string, unknown> = {}): void {
  track("onboarding_step_viewed", { step_index: index, step_id: stepId(index), ...props });
}

export function trackStepCompleted(
  index: number,
  msOnStep: number,
  props: Record<string, unknown> = {},
): void {
  track("onboarding_step_completed", {
    step_index: index,
    step_id: stepId(index),
    ms_on_step: msOnStep,
    ...props,
  });
}

export function trackStepBack(from: number, to: number): void {
  track("onboarding_step_back", {
    from_step_id: stepId(from),
    to_step_id: stepId(to),
  });
}

export function trackValidationFailed(index: number, fields: string[]): void {
  track("onboarding_validation_failed", {
    step_index: index,
    step_id: stepId(index),
    fields,
  });
}

export function trackOnboardingCompleted(
  msTotal: number,
  props: Record<string, unknown> = {},
): void {
  track("onboarding_completed", { ms_total: msTotal, ...props });
}

export function trackOnboardingResumed(index: number): void {
  track("onboarding_resumed", { step_index: index, step_id: stepId(index) });
}

/** Drop-off: fired when the user leaves the flow before finishing. */
export function trackOnboardingAbandoned(
  index: number,
  reason: "page_hidden" | "navigated_away" | "unload",
  msTotal: number,
): void {
  track("onboarding_abandoned", {
    step_index: index,
    step_id: stepId(index),
    reason,
    ms_total: msTotal,
  });
}

export type InstallEventName =
  | "install_prompt_shown"
  | "install_prompt_dismissed"
  | "install_accepted"
  | "install_declined"
  | "install_failed"
  | "install_retry_clicked"
  | "install_troubleshoot_shown"
  | "install_instructions_shown"
  | "install_link_copied"
  | "apk_download_clicked";

export function trackInstall(
  name: InstallEventName,
  props: Record<string, unknown> = {},
): void {
  track(name, props);
}

/* ---------------- Onboarding help, connectivity & summary ---------------- */

export function trackHelpOpened(stepIndex: number, topic: string): void {
  track("onboarding_help_opened", { step_index: stepIndex, step_id: stepId(stepIndex), topic });
}

export function trackHelpFaqExpanded(stepIndex: number, question: string): void {
  track("onboarding_help_faq_expanded", {
    step_index: stepIndex,
    step_id: stepId(stepIndex),
    question,
  });
}

export function trackConnectivity(
  state: "offline" | "online" | "resume_blocked" | "retry_clicked",
  stepIndex: number,
): void {
  track("onboarding_connectivity", { state, step_index: stepIndex, step_id: stepId(stepIndex) });
}

export function trackSummaryEmail(
  state: "requested" | "sent" | "failed" | "skipped",
  props: Record<string, unknown> = {},
): void {
  track("onboarding_summary_email", { state, ...props });
}

