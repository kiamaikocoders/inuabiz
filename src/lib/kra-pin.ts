/** Kenyan KRA PIN: letter + 9 digits + letter, e.g. A012345678Z */
const KRA_PIN_RE = /^[A-Z][0-9]{9}[A-Z]$/;

export function normalizeKraPin(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidKraPin(raw: string): boolean {
  const pin = normalizeKraPin(raw);
  return KRA_PIN_RE.test(pin);
}

export function kraPinError(raw: string): string | null {
  const pin = normalizeKraPin(raw);
  if (!pin) return "Enter your KRA PIN";
  if (!KRA_PIN_RE.test(pin)) {
    return "Use the format A123456789Z (letter, 9 digits, letter)";
  }
  return null;
}
