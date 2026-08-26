/**
 * PayHero Kenya API v2 — STK push + transaction status for InuaBiz subscriptions.
 * Credentials: Deno.env first, then private.app_secrets via get_app_secret.
 */

import { getServiceClient } from "./cors.ts";

const PAYHERO_BASE = "https://backend.payhero.co.ke/api/v2";
const secretCache = new Map<string, string>();

export async function resolvePayHeroSecret(name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name);
  if (fromEnv != null && fromEnv !== "") return fromEnv;

  if (secretCache.has(name)) return secretCache.get(name)!;

  const service = getServiceClient();
  const { data, error } = await service.rpc("get_app_secret", { p_name: name });
  if (error) {
    console.error("get_app_secret", name, error.message);
    return null;
  }
  if (typeof data === "string" && data.length > 0) {
    secretCache.set(name, data);
    return data;
  }
  return null;
}

/** PayHero expects 07… / 01… local format. */
export function toPayHeroPhone(msisdn254: string): string {
  const digits = msisdn254.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `0${digits}`;
  return msisdn254;
}

export type PayHeroStkResult = {
  success?: boolean;
  status?: string;
  reference?: string;
  CheckoutRequestID?: string;
  error_message?: string;
  [k: string]: unknown;
};

export async function payheroAuthHeader(): Promise<string> {
  const token =
    (await resolvePayHeroSecret("PAYHERO_AUTH_TOKEN")) ??
    (await resolvePayHeroSecret("PAYHERO_BASIC_AUTH"));
  if (!token) throw new Error("PAYHERO_AUTH_TOKEN not configured");
  return token.startsWith("Basic ") ? token : `Basic ${token}`;
}

export async function payheroChannelId(): Promise<number> {
  const raw = await resolvePayHeroSecret("PAYHERO_CHANNEL_ID");
  if (!raw) throw new Error("PAYHERO_CHANNEL_ID not configured");
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) throw new Error("PAYHERO_CHANNEL_ID invalid");
  return id;
}

/**
 * POST /api/v2/payments — M-Pesa STK push (InuaBiz subscription collection).
 */
export async function payheroStkPush(params: {
  amount: number;
  phone: string;
  externalReference: string;
  callbackUrl: string;
  customerName?: string;
}): Promise<PayHeroStkResult> {
  const auth = await payheroAuthHeader();
  const channelId = await payheroChannelId();

  const res = await fetch(`${PAYHERO_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amount),
      phone_number: toPayHeroPhone(params.phone),
      channel_id: channelId,
      provider: "m-pesa",
      external_reference: params.externalReference,
      customer_name: params.customerName,
      callback_url: params.callbackUrl,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as PayHeroStkResult & {
    error_code?: string;
    status_code?: number;
  };
  if (!res.ok || data.success === false) {
    const msg = String(
      data.error_message ??
        data.error_code ??
        `PayHero STK failed (${res.status})`,
    );
    throw new Error(msg);
  }
  return data;
}

export type PayHeroStatusResult = {
  status?: string;
  success?: boolean;
  provider_reference?: string;
  reference?: string;
  CheckoutRequestID?: string;
  [k: string]: unknown;
};

/** GET /api/v2/transaction-status?reference=… */
export async function payheroTransactionStatus(
  reference: string,
): Promise<PayHeroStatusResult> {
  const auth = await payheroAuthHeader();
  const url = new URL(`${PAYHERO_BASE}/transaction-status`);
  url.searchParams.set("reference", reference);

  const res = await fetch(url.toString(), {
    headers: { Authorization: auth },
  });

  const data = (await res.json().catch(() => ({}))) as PayHeroStatusResult;
  if (!res.ok) {
    throw new Error(`PayHero status failed (${res.status})`);
  }
  return data;
}

export function mapPayHeroStatus(
  status: string | undefined,
): "PENDING" | "COMPLETE" | "FAILED" {
  const s = (status ?? "QUEUED").toUpperCase();
  if (s === "SUCCESS" || s === "COMPLETE" || s === "COMPLETED") return "COMPLETE";
  if (s === "FAILED" || s === "CANCELLED" || s === "CANCELED") return "FAILED";
  return "PENDING";
}

export function functionsPublicBase(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL missing");
  return `${url}/functions/v1`;
}
