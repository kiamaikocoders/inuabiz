/** Normalise a Kenyan mobile number to E.164 (`+2547…`) and 254-prefixed digits. */

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

export function to254(input: string): string {
  const d = digitsOnly(input);
  if (d.startsWith("254") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return `254${d.slice(1)}`;
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("1"))) return `254${d}`;
  return d;
}

export function toE164Ke(input: string): string {
  return `+${to254(input)}`;
}

export function prettyKePhone(input: string): string {
  const d = to254(input);
  if (d.length !== 12) return input;
  return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}
