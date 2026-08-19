import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

/** Normalise Kenyan MSISDN to 2547… / 2541… */
export function toKenyaMsisdn(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  throw new Error("Invalid Kenyan phone number");
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Missing Supabase anon credentials");
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type IntaSendStkResponse = {
  invoice?: { invoice_id?: string; state?: string; [k: string]: unknown };
  invoice_id?: string;
  tracking_id?: string;
  state?: string;
  [k: string]: unknown;
};

/**
 * Trigger M-Pesa STK Push via IntaSend Collection API.
 * Docs: POST /api/v1/payment/mpesa-stk-push/
 */
export async function intasendMpesaStkPush(params: {
  amount: number;
  phone_number: string;
  api_ref: string;
  narrative?: string;
  email?: string;
}): Promise<IntaSendStkResponse> {
  const secret = Deno.env.get("INTASEND_SECRET_KEY");
  const publishable = Deno.env.get("INTASEND_PUBLISHABLE_KEY");
  const host = Deno.env.get("INTASEND_HOST") ?? "https://api.inuabiz.co.ke";
  const sandbox = (Deno.env.get("INTASEND_SANDBOX") ?? "true") === "true";

  if (!secret || !publishable) {
    throw new Error("IntaSend keys not configured");
  }

  const base = sandbox
    ? "https://sandbox.intasend.com"
    : "https://payment.intasend.com";

  const res = await fetch(`${base}/api/v1/payment/mpesa-stk-push/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-IntaSend-Public-API-Key": publishable,
    },
    body: JSON.stringify({
      amount: params.amount,
      phone_number: params.phone_number,
      api_ref: params.api_ref,
      email: params.email ?? "billing@inuabiz.co.ke",
      narrative: params.narrative ?? "InuaBiz payment",
      host,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `IntaSend STK failed (${res.status})`,
    );
  }
  return data as IntaSendStkResponse;
}

export async function intasendPaymentStatus(
  invoiceId: string,
): Promise<{ state?: string; invoice?: { state?: string; invoice_id?: string } }> {
  const secret = Deno.env.get("INTASEND_SECRET_KEY");
  const publishable = Deno.env.get("INTASEND_PUBLISHABLE_KEY");
  const sandbox = (Deno.env.get("INTASEND_SANDBOX") ?? "true") === "true";
  if (!secret || !publishable) throw new Error("IntaSend keys not configured");

  const base = sandbox
    ? "https://sandbox.intasend.com"
    : "https://payment.intasend.com";

  const res = await fetch(`${base}/api/v1/payment/status/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-IntaSend-Public-API-Key": publishable,
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      public_key: publishable,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`IntaSend status failed (${res.status})`);
  }
  return data as { state?: string; invoice?: { state?: string; invoice_id?: string } };
}

export function extractInvoiceId(payload: IntaSendStkResponse): string {
  const id =
    payload.invoice?.invoice_id ??
    payload.invoice_id ??
    (typeof payload.id === "string" ? payload.id : null);
  if (!id) throw new Error("IntaSend response missing invoice_id");
  return id;
}

export function mapIntaSendState(
  state: string | undefined,
): "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED" {
  const s = (state ?? "PENDING").toUpperCase();
  if (s === "COMPLETE" || s === "COMPLETED" || s === "PAID") return "COMPLETE";
  if (s === "FAILED" || s === "DECLINED") return "FAILED";
  if (s === "CANCELLED" || s === "CANCELED") return "CANCELLED";
  return "PENDING";
}
