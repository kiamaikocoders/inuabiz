/** Parse Safaricom M-Pesa confirmation SMS. Ignore sent/airtime/Fuliza. */

export type ParsedMpesaSms =
  | {
      kind: "received";
      receipt: string;
      amount: number;
      sender: string | null;
    }
  | { kind: "ignored"; reason: string };

export function parseMpesaSms(body: string): ParsedMpesaSms {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return { kind: "ignored", reason: "empty" };

  const lower = text.toLowerCase();
  if (/\bsent to\b/.test(lower) || /\byou have sent\b/.test(lower)) {
    return { kind: "ignored", reason: "outbound" };
  }
  if (
    /\bairtime\b/.test(lower) ||
    /\bfuliza\b/.test(lower) ||
    (/\bpaybill\b/.test(lower) && /\bpaid\b/.test(lower) && !/\breceived\b/.test(lower))
  ) {
    return { kind: "ignored", reason: "non_sale" };
  }

  const isReceived =
    /\byou have received\b/.test(lower) ||
    /\bhas been received\b/.test(lower) ||
    /\breceived ksh\b/.test(lower) ||
    /\bksh[\d,.]+\s+received\b/.test(lower) ||
    (/\breceived\b/.test(lower) && !/\bsent\b/.test(lower));
  if (!isReceived) return { kind: "ignored", reason: "not_received" };

  const receiptStart = text.match(/^([A-Z0-9]{8,12})\s+Confirmed/i);
  const receiptLoose = text.match(/\b([A-Z][A-Z0-9]{8,11})\b/);
  const receipt = (receiptStart?.[1] ?? receiptLoose?.[1] ?? "").toUpperCase();
  if (!/^[A-Z0-9]{8,12}$/.test(receipt)) {
    return { kind: "ignored", reason: "no_receipt" };
  }

  const amountMatch = text.match(/(?:Ksh|KES|KSH)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return { kind: "ignored", reason: "no_amount" };
  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { kind: "ignored", reason: "bad_amount" };
  }

  const senderMatch =
    text.match(/\bfrom\s+(.+?)\s+on\s+\d/i) ??
    text.match(/\bfrom\s+(\+?254\d{9}|0[17]\d{8}|\d{9,12})\b/i);
  const sender = senderMatch?.[1]?.trim() ?? null;

  return { kind: "received", receipt, amount, sender };
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
