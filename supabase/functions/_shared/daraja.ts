/**
 * Safaricom Daraja 2.0 helpers — OAuth, STK, C2B, Ratiba, Bill Manager.
 * Credentials: Deno.env first, then private.app_secrets via get_app_secret (service_role).
 *
 * Live mode: DARAJA_MOCK=false (default). Set DARAJA_MOCK=true only to skip
 * Safaricom HTTP and return deterministic payloads.
 */

import { getServiceClient } from "./cors.ts";

export type DarajaToken = { access_token: string; expires_in: string };

let cachedToken: { token: string; expiresAt: number } | null = null;
const secretCache = new Map<string, string>();

/**
 * Resolve a config/secret value. Prefers Edge Function env, then DB store.
 */
export async function resolveSecret(name: string): Promise<string | null> {
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

export async function isDarajaMock(): Promise<boolean> {
  const mock = (await resolveSecret("DARAJA_MOCK")) ?? "false";
  return mock === "true";
}

function stkTimestamp(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}${g("month")}${g("day")}${g("hour")}${g("minute")}${g("second")}`;
}

export type DarajaStkResult = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  [k: string]: unknown;
};

/**
 * Lipa Na M-Pesa Express (STK Push). Sandbox shortcode 174379 + official passkey.
 */
export async function darajaStkPush(params: {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
  callBackURL: string;
}): Promise<DarajaStkResult> {
  if (await isDarajaMock()) {
    return {
      mock: true,
      MerchantRequestID: `mock-m-${Date.now()}`,
      CheckoutRequestID: `mock-c-${Date.now()}`,
      ResponseCode: "0",
      ResponseDescription: "Mock STK accepted",
      CustomerMessage: "Success. Request accepted for processing",
    };
  }

  const token = await getDarajaAccessToken();
  const shortcode =
    (await resolveSecret("DARAJA_STK_SHORTCODE")) ?? "174379";
  const passkey = await resolveSecret("DARAJA_PASSKEY");
  if (!passkey) throw new Error("DARAJA_PASSKEY not set");

  const timestamp = stkTimestamp();
  const password = btoa(`${shortcode}${passkey}${timestamp}`);

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(params.amount),
        PartyA: params.phone,
        PartyB: shortcode,
        PhoneNumber: params.phone,
        CallBackURL: params.callBackURL,
        AccountReference: params.accountReference.slice(0, 12),
        TransactionDesc: params.transactionDesc.slice(0, 13),
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as DarajaStkResult & {
    errorMessage?: string;
  };
  if (!res.ok || String(data.ResponseCode ?? "1") !== "0") {
    throw new Error(
      String(
        data.errorMessage ??
          data.ResponseDescription ??
          `STK Push failed (${res.status})`,
      ),
    );
  }
  return data;
}

export type DarajaStkQueryResult = {
  ResponseCode?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  ResponseDescription?: string;
  errorMessage?: string;
  [k: string]: unknown;
};

/**
 * Query Lipa Na M-Pesa Express status when the STK callback is delayed.
 * ResultCode 0 = paid. 1032/1037/1/2001 = failed. Anything else = still pending.
 */
export async function darajaStkQuery(checkoutRequestId: string): Promise<{
  outcome: "COMPLETE" | "FAILED" | "PENDING";
  raw: DarajaStkQueryResult;
}> {
  if (await isDarajaMock()) {
    return { outcome: "PENDING", raw: { mock: true, ResultCode: "4999" } };
  }

  const token = await getDarajaAccessToken();
  const shortcode =
    (await resolveSecret("DARAJA_STK_SHORTCODE")) ?? "174379";
  const passkey = await resolveSecret("DARAJA_PASSKEY");
  if (!passkey) throw new Error("DARAJA_PASSKEY not set");

  const timestamp = stkTimestamp();
  const password = btoa(`${shortcode}${passkey}${timestamp}`);

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as DarajaStkQueryResult;
  const resultCode = String(data.ResultCode ?? "");
  const failedCodes = new Set(["1", "1032", "1037", "2001", "1019", "1001"]);

  if (resultCode === "0") return { outcome: "COMPLETE", raw: data };
  if (failedCodes.has(resultCode)) return { outcome: "FAILED", raw: data };
  return { outcome: "PENDING", raw: data };
}

export async function darajaRegisterC2bUrls(params: {
  confirmationUrl: string;
  validationUrl: string;
}): Promise<Record<string, unknown>> {
  const token = await getDarajaAccessToken();
  const shortcode =
    (await resolveSecret("DARAJA_C2B_SHORTCODE")) ??
    (await resolveSecret("DARAJA_BUSINESS_SHORTCODE")) ??
    "600984";

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/mpesa/c2b/v1/registerurl`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: shortcode,
        ResponseType: "Completed",
        ConfirmationURL: params.confirmationUrl,
        ValidationURL: params.validationUrl,
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      String(data.errorMessage ?? data.ResponseDescription ?? `C2B register failed (${res.status})`),
    );
  }
  return data;
}

export async function darajaBaseUrl(): Promise<string> {
  const sandbox = (await resolveSecret("DARAJA_SANDBOX")) ?? "true";
  return sandbox === "true"
    ? "https://sandbox.safaricom.co.ke"
    : "https://api.safaricom.co.ke";
}

export async function getDarajaAccessToken(): Promise<string> {
  if (await isDarajaMock()) {
    return "mock-daraja-token";
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const key = await resolveSecret("DARAJA_CONSUMER_KEY");
  const secret = await resolveSecret("DARAJA_CONSUMER_SECRET");
  if (!key || !secret) {
    throw new Error("Daraja consumer credentials not configured");
  }

  const basic = btoa(`${key}:${secret}`);
  const res = await fetch(
    `${await darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${basic}` } },
  );

  const data = (await res.json()) as DarajaToken & { errorMessage?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.errorMessage ?? `Daraja OAuth failed (${res.status})`);
  }

  const ttlSec = Number(data.expires_in ?? "3599");
  cachedToken = {
    token: data.access_token,
    expiresAt: now + ttlSec * 1000,
  };
  return data.access_token;
}

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchWithRetries(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      // Retry gateway timeouts / upstream blips
      if ([502, 503, 504].includes(res.status) && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Daraja request failed");
}

/**
 * Frequency codes (Daraja Ratiba): 1 One-off … 4 Monthly (default) … 8 Yearly.
 * Uses DARAJA_BUSINESS_SHORTCODE (C2B / app shortcode, e.g. 600984).
 */
export async function createRatibaStandingOrder(params: {
  standingOrderName: string;
  amount: number;
  partyA: string;
  accountReference: string;
  transactionDesc: string;
  customStoId: string;
  startDate?: Date;
  endDate?: Date;
  callBackURL: string;
}): Promise<Record<string, unknown>> {
  if (await isDarajaMock()) {
    return {
      mock: true,
      ResponseCode: "0",
      ResponseDescription: "Mock Ratiba standing order accepted",
      ResponseRefID: `MOCK-STO-${params.customStoId.slice(0, 8)}`,
      StandingOrderID: `MOCK-STO-${params.customStoId}`,
      CustomStoId: params.customStoId,
    };
  }

  const token = await getDarajaAccessToken();
  const shortcode =
    (await resolveSecret("DARAJA_BUSINESS_SHORTCODE")) ??
    (await resolveSecret("DARAJA_C2B_SHORTCODE"));
  if (!shortcode) throw new Error("DARAJA_BUSINESS_SHORTCODE not set");

  const frequency = (await resolveSecret("DARAJA_RATIBA_FREQUENCY")) ?? "4";
  const start = params.startDate ?? new Date();
  const end = params.endDate ?? new Date(start);
  end.setFullYear(end.getFullYear() + 2);

  const transactionType =
    (await resolveSecret("DARAJA_RATIBA_TRANSACTION_TYPE")) ??
    "Standing Order Pay Bill External Third Party";

  const receiverType =
    (await resolveSecret("DARAJA_RECEIVER_IDENTIFIER_TYPE")) ?? "4";

  const body = {
    StandingOrderName: params.standingOrderName,
    BusinessShortCode: shortcode,
    TransactionType: transactionType,
    Amount: Math.round(params.amount),
    PartyA: params.partyA,
    ReceiverPartyIdentifierType: receiverType,
    CallBackURL: params.callBackURL,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.transactionDesc.slice(0, 13),
    Frequency: frequency,
    StartDate: yyyymmdd(start),
    EndDate: yyyymmdd(end),
    CustomStoId: params.customStoId,
  };

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/standingorder/v1/createStandingOrderExternal`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      String(data.errorMessage ?? data.ResponseDescription ?? data.responseMessage ?? `Ratiba failed (${res.status})`),
    );
  }
  return data;
}

export async function billManagerSingleInvoice(params: {
  externalReference: string;
  billedFullName: string;
  billedPhoneNumber: string;
  billedPeriod: string;
  invoiceName: string;
  dueDate: string;
  accountReference: string;
  amount: number;
  invoiceItems?: Array<{ itemName: string; amount: number }>;
}): Promise<Record<string, unknown>> {
  if (await isDarajaMock()) {
    return {
      mock: true,
      statusCode: "200",
      statusMessage: "Mock invoice accepted",
      rescode: "200",
      resmsg: "Success",
      externalReference: params.externalReference,
    };
  }

  const token = await getDarajaAccessToken();
  const appKey = await resolveSecret("DARAJA_BILL_MANAGER_APP_KEY");
  if (!appKey || appKey === "SANDBOX_APP_KEY") {
    throw new Error("DARAJA_BILL_MANAGER_APP_KEY not set (from Bill Manager opt-in)");
  }

  const wireItems = params.invoiceItems?.map((i) => ({
    itemName: i.itemName,
    amount: String(Math.round(i.amount)),
  }));

  const body: Record<string, unknown> = {
    externalReference: params.externalReference,
    billedFullName: params.billedFullName,
    billedPhoneNumber: params.billedPhoneNumber.replace(/\D/g, ""),
    billedPeriod: params.billedPeriod,
    invoiceName: params.invoiceName,
    dueDate: params.dueDate,
    accountReference: params.accountReference,
    amount: String(Math.round(params.amount)),
  };
  if (wireItems?.length) body.invoiceItems = wireItems;

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/v1/billmanager-invoice/single-invoicing`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        appKey,
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      String(data.errorMessage ?? data.statusMessage ?? `Bill Manager failed (${res.status})`),
    );
  }
  return data;
}

export async function billManagerCancelInvoice(
  externalReference: string,
): Promise<Record<string, unknown>> {
  if (await isDarajaMock()) {
    return {
      mock: true,
      statusCode: "200",
      statusMessage: "Mock cancel accepted",
      externalReference,
    };
  }

  const token = await getDarajaAccessToken();
  const appKey = await resolveSecret("DARAJA_BILL_MANAGER_APP_KEY");
  if (!appKey || appKey === "SANDBOX_APP_KEY") {
    throw new Error("DARAJA_BILL_MANAGER_APP_KEY not set");
  }

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/v1/billmanager-invoice/cancel-single-invoice`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        appKey,
      },
      body: JSON.stringify({ externalReference }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      String(data.errorMessage ?? data.statusMessage ?? `Cancel invoice failed (${res.status})`),
    );
  }
  return data;
}

/**
 * Bill Manager opt-in with retries. Uses DARAJA_BILL_MANAGER_SHORTCODE (718003).
 */
export async function billManagerOptIn(params: {
  shortcode?: string;
  email: string;
  officialContact: string;
  sendReminders?: string | number | boolean;
  callbackUrl: string;
}): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; mocked?: boolean }> {
  const shortcode =
    params.shortcode ??
    (await resolveSecret("DARAJA_BILL_MANAGER_SHORTCODE")) ??
    "718003";

  if (await isDarajaMock()) {
    // Keep bypass key unless a real opt-in later overwrites it
    return {
      ok: true,
      status: 200,
      mocked: true,
      data: {
        mock: true,
        app_key: "SANDBOX_APP_KEY",
        statusMessage: "Mock opt-in (Safaricom sandbox bypass)",
        shortcode,
      },
    };
  }

  const token = await getDarajaAccessToken();
  const payload = {
    shortcode,
    email: params.email,
    officialContact: String(params.officialContact).replace(/\D/g, ""),
    sendReminders: params.sendReminders ?? "1",
    callbackUrl: params.callbackUrl,
  };

  const res = await fetchWithRetries(
    `${await darajaBaseUrl()}/v1/billmanager-invoice/optin`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
    4,
  );

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    data = { raw: rawText };
  }

  return { ok: res.ok, status: res.status, data };
}

export function functionsPublicBase(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL missing");
  return `${url}/functions/v1`;
}

export async function subscriptionAmountKes(tenantId?: string): Promise<number> {
  if (tenantId) {
    try {
      const service = getServiceClient();
      const { data } = await service.rpc("subscription_amount_for_tenant", {
        p_tenant_id: tenantId,
      });
      if (data != null && Number.isFinite(Number(data))) return Number(data);
    } catch {
      /* fall through to plan / secret default */
    }
  }
  try {
    const service = getServiceClient();
    const { data } = await service.rpc("plan_amount_kes", { p_code: "SHOP_MONTHLY" });
    if (data != null && Number.isFinite(Number(data)) && Number(data) > 0) {
      return Number(data);
    }
  } catch {
    /* fall through */
  }
  const raw = (await resolveSecret("SUBSCRIPTION_AMOUNT_KES")) ?? "3000";
  return Number(raw);
}
