/** Code + payer the way an M-Pesa received SMS reads (no official wordmark). */

export function mpesaCodeAndName(
  code?: string | null,
  name?: string | null,
): string {
  const c = code?.trim() ?? "";
  const n = name?.trim() ?? "";
  if (c && n) return `${c} · ${n}`;
  return c || n;
}
