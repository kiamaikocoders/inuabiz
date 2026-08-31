/** Env-gated Clarity + Sentry status helpers for admin Intelligence. */

export function clarityConfigured(): boolean {
  return Boolean(import.meta.env["VITE_CLARITY_PROJECT_ID"]);
}

export function sentryConfigured(): boolean {
  return Boolean(import.meta.env["VITE_SENTRY_DSN"]);
}

export function initClarity(): void {
  if (typeof window === "undefined") return;
  const projectId = import.meta.env["VITE_CLARITY_PROJECT_ID"] as string | undefined;
  if (!projectId) return;
  const w = window as Window & { clarity?: (...args: unknown[]) => void };
  if (w.clarity) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);

  // Minimal stub until the real script loads
  w.clarity = (...args: unknown[]) => {
    (w.clarity as { q?: unknown[][] }).q = (w.clarity as { q?: unknown[][] }).q ?? [];
    (w.clarity as { q: unknown[][] }).q.push(args);
  };
}
