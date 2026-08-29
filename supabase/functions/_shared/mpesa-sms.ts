/** Parse Safaricom M-Pesa confirmation SMS. Ignore sent/airtime/Fuliza. */

export type ParsedMpesaSms =
  | {
      kind: "received";
      receipt: string;
      amount: number;
      /** Normalised Kenyan MSISDN digits (2547…), if present. */
      sender: string | null;
      /** Person or bank as written in the SMS, without the phone. */
      senderName: string | null;
    }
  | { kind: "ignored"; reason: string };

const PHONE_RE = /(\+?254[17]\d{8}|0[17]\d{8})/;

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

function to254(input: string): string {
  const d = digitsOnly(input);
  if (d.startsWith("254") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return `254${d.slice(1)}`;
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("1"))) return `254${d}`;
  return d;
}

/** Split "JOHN KAMAU 2547…" or "EQUITY BANK LIMITED Acc. 12" into name + phone. */
export function splitMpesaParty(fromRaw: string): { name: string | null; msisdn: string | null } {
  let raw = fromRaw.replace(/\s+/g, " ").trim();
  raw = raw.replace(/\s+New\s+(M-PESA|M-Pesa|Utility|till).*$/i, "").trim();
  raw = raw.replace(/[.,;]+$/g, "").trim();

  const phone = raw.match(PHONE_RE);
  let msisdn: string | null = null;
  let name = raw;
  if (phone) {
    const n = to254(phone[1] ?? phone[0]);
    msisdn = n.length === 12 ? n : null;
    name = raw.replace(phone[0], " ").replace(/\s+/g, " ").trim();
  }
  name = name.replace(/\s+Acc\.?\s*[\d\s]+$/i, "").trim();
  name = name.replace(/^from\s+/i, "").trim();
  if (!name || /^[\d+\s-]+$/.test(name)) name = "";
  return { name: name || null, msisdn };
}

function extractFromClause(text: string): string | null {
  const beforeDate = text.match(/\bfrom\s+(.+?)\s+on\s+\d/i);
  if (beforeDate?.[1]) return beforeDate[1].trim();
  const beforeNew = text.match(/\bfrom\s+(.+?)(?:\.|\s+New\s)/i);
  if (beforeNew?.[1]) return beforeNew[1].trim();
  const phoneOnly = text.match(/\bfrom\s+(\+?254[17]\d{8}|0[17]\d{8}|\d{9,12})\b/i);
  return phoneOnly?.[1]?.trim() ?? null;
}

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

  const party = splitMpesaParty(extractFromClause(text) ?? "");
  return {
    kind: "received",
    receipt,
    amount,
    sender: party.msisdn,
    senderName: party.name,
  };
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
