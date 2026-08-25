/**
 * Lightweight client-side A/B testing.
 *
 * Assignment is sticky per browser (localStorage), 50/50 by default, and every
 * analytics event automatically carries the active variants so drop-off and
 * completion rates can be compared per variant.
 */

import { setGlobalProps, track } from "@/lib/analytics";

export const EXPERIMENTS = {
  onboarding_copy: ["control", "guided"],
  install_prompt: ["control", "benefit_led"],
} as const;

export type ExperimentId = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentId> = (typeof EXPERIMENTS)[K][number];

const KEY = "inuabiz.experiments";

type Assignments = Partial<Record<ExperimentId, string>>;

function readAll(): Assignments {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Assignments) : {};
  } catch {
    return {};
  }
}

function writeAll(next: Assignments): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — variant stays in-memory for this page view */
  }
}

const memory: Assignments = {};

/** Sticky variant for an experiment. Falls back to the control on the server. */
export function getVariant<K extends ExperimentId>(id: K): VariantOf<K> {
  const variants = EXPERIMENTS[id] as readonly string[];
  if (typeof window === "undefined") return variants[0] as VariantOf<K>;
  const stored = readAll();
  const existing = stored[id] ?? memory[id];
  if (existing && variants.includes(existing)) return existing as VariantOf<K>;
  const picked = variants[Math.floor(Math.random() * variants.length)]!;
  memory[id] = picked;
  writeAll({ ...stored, [id]: picked });
  return picked as VariantOf<K>;
}

/** All active assignments — attached to every analytics event. */
export function activeVariants(): Record<string, string> {
  const all = { ...readAll(), ...memory };
  const out: Record<string, string> = {};
  for (const id of Object.keys(EXPERIMENTS) as ExperimentId[]) {
    const v = all[id];
    if (v) out[`exp_${id}`] = v;
  }
  return out;
}

/** Called once per surface so exposures can be joined to outcomes. */
export function trackExposure<K extends ExperimentId>(id: K, surface: string): VariantOf<K> {
  const variant = getVariant(id);
  setGlobalProps(activeVariants());
  track("experiment_exposed", { experiment: id, variant, surface });
  return variant;
}

/** Force a variant (QA / demos): /onboarding?exp_onboarding_copy=guided */
export function applyVariantOverrides(search: string): void {
  if (typeof window === "undefined" || !search) return;
  const params = new URLSearchParams(search);
  const stored = readAll();
  let changed = false;
  for (const id of Object.keys(EXPERIMENTS) as ExperimentId[]) {
    const value = params.get(`exp_${id}`);
    if (value && (EXPERIMENTS[id] as readonly string[]).includes(value)) {
      stored[id] = value;
      memory[id] = value;
      changed = true;
    }
  }
  if (changed) writeAll(stored);
  setGlobalProps(activeVariants());
}
