import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  BUSINESS_HINTS,
  PAYMENT_EXPLAINERS,
  roiEstimate,
  SHOP_MONTHLY_KES,
  TRIAL_DAYS,
} from "../_shared/landing-bot-knowledge.ts";
import { vercelAiChat } from "../_shared/vercel-ai.ts";

type ChatMessage = { role: "user" | "assistant"; content: string };

type BotResponse = {
  reply: string;
  quick_replies?: string[];
  lead_id?: string;
  signup_url?: string;
  roi?: ReturnType<typeof roiEstimate>;
};

function isSignupIntent(text: string): boolean {
  return /sign\s*up|register|join|create an? account|how do i (sign|start|join)|get started|start free trial|open an account/i.test(
    text,
  );
}

/** The visitor is already on inuabiz.co.ke — strip "go visit the website" fluff. */
function polishReply(reply: string): string {
  let out = reply
    .replace(/\bvisit our (official )?site at inuabiz\.co\.ke\b/gi, "tap Start free trial below")
    .replace(/\bvisit inuabiz\.co\.ke\b/gi, "tap Start free trial below")
    .replace(/\bhead over to (the )?website\b/gi, "tap Start free trial below")
    .replace(/\bgo to (the )?website\b/gi, "tap Start free trial below")
    .replace(/\bfind the signup option there\b/gi, "use the Start free trial button in this chat")
    .replace(/\bon the website\b/gi, "right here in this chat")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

function heuristicReply(
  message: string,
  history: ChatMessage[],
): BotResponse {
  const text = `${history.map((m) => m.content).join(" ")} ${message}`.toLowerCase();

  if (/pochi|companion|sms|android phone/.test(text)) {
    return {
      reply: PAYMENT_EXPLAINERS.pochi!,
      quick_replies: ["Till number setup", "Calculate savings", "Start free trial"],
    };
  }
  if (/till|buy goods|lipa na mpesa till/.test(text)) {
    return {
      reply: PAYMENT_EXPLAINERS.till!,
      quick_replies: ["Pochi la Biashara", "Pricing", "Start free trial"],
    };
  }
  if (/paybill|account number/.test(text)) {
    return {
      reply: PAYMENT_EXPLAINERS.paybill!,
      quick_replies: ["Till vs Paybill", "Start free trial"],
    };
  }
  if (/personal|send money|my number/.test(text)) {
    return {
      reply: PAYMENT_EXPLAINERS.personal_mpesa!,
      quick_replies: ["Till setup", "Start free trial"],
    };
  }
  if (/chemist|duka|eatery|boutique|hardware|shop type|business/.test(text)) {
    const kind = /chemist/.test(text)
      ? "chemist"
      : /eatery|hotel|restaurant/.test(text)
        ? "eatery"
        : /boutique/.test(text)
          ? "boutique"
          : /hardware/.test(text)
            ? "hardware"
            : "duka";
    return {
      reply: `Karibu! For a ${kind}, InuaBiz helps with: ${BUSINESS_HINTS[kind] ?? BUSINESS_HINTS.other} What M-Pesa setup do you use today — Till, Pochi, or Paybill?`,
      quick_replies: ["Till", "Pochi", "Paybill", "Calculate savings"],
    };
  }
  if (/price|pricing|cost|3000|subscription|trial/.test(text)) {
    return {
      reply: `KES ${SHOP_MONTHLY_KES} per shop per month after a ${TRIAL_DAYS}-day free trial on your first shop. No card terminal rental. Want a savings estimate? Tell me roughly how many sales you do per day.`,
      quick_replies: ["~20 sales/day", "~50 sales/day", "Start free trial"],
    };
  }
  if (/save|roi|rent|terminal|compare/.test(text)) {
    const txMatch = text.match(/(\d+)\s*(sales|tx|transactions)/);
    const roi = roiEstimate({ txPerDay: txMatch ? Number(txMatch[1]) : undefined });
    return {
      reply: `${roi.note} Estimated saving ≈ KES ${roi.monthlySavingsKes}/month vs a rented terminal (rough guide).`,
      quick_replies: ["Start free trial", "How does Pochi work?"],
      roi,
    };
  }
  if (/signup|start|trial|register|join|how do i sign|get started|create account/.test(text)) {
    return {
      reply:
        "You're already on InuaBiz — tap Start free trial below. Add your name, shop name and email, confirm the OTP, then pick your M-Pesa Till or Pochi setup. Your first shop gets a 3-day trial, then KES 3,000/shop/month.",
      quick_replies: ["Start free trial", "How does Pochi work?"],
      signup_url: "/signup",
    };
  }

  return {
    reply:
      "Habari! I'm the InuaBiz assistant. Ask about Till vs Pochi auto-clear, pricing (KES 3,000/shop), or tell me your business type — duka, chemist, eatery?",
    quick_replies: ["Pochi setup", "Till setup", "Calculate savings", "Start free trial"],
  };
}

function extractLeadFields(history: ChatMessage[], latest: string): {
  business_name?: string;
  phone_number?: string;
  location?: string;
  business_type?: string;
  payment_method_used?: string;
} {
  const blob = `${history.map((m) => m.content).join("\n")}\n${latest}`;
  const phone = blob.match(/(?:\+254|0)?[17]\d{8}/)?.[0]?.replace(/\D/g, "");
  const normalizedPhone = phone
    ? phone.startsWith("254")
      ? phone
      : phone.startsWith("0")
        ? `254${phone.slice(1)}`
        : `254${phone}`
    : undefined;

  let business_type: string | undefined;
  if (/chemist|pharmacy/i.test(blob)) business_type = "chemist";
  else if (/eatery|restaurant|hotel/i.test(blob)) business_type = "eatery";
  else if (/boutique/i.test(blob)) business_type = "boutique";
  else if (/hardware/i.test(blob)) business_type = "hardware";
  else if (/duka|shop|kiosk/i.test(blob)) business_type = "duka";

  let payment_method_used: string | undefined;
  if (/pochi/i.test(blob)) payment_method_used = "pochi";
  else if (/till|buy goods/i.test(blob)) payment_method_used = "till";
  else if (/paybill/i.test(blob)) payment_method_used = "paybill";
  else if (/personal mpesa|send money/i.test(blob)) payment_method_used = "personal_mpesa";

  const locationMatch = blob.match(
    /(?:in|at|from|area)\s+([A-Za-z][A-Za-z\s,-]{2,40}(?:Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika|Kasarani|Westlands|Eastleigh)?)/i,
  );
  const shopMatch = blob.match(
    /(?:shop|business|duka|store)(?:\s+name)?(?:\s+is|:)?\s*([A-Za-z0-9][A-Za-z0-9\s'-]{2,40})/i,
  );

  return {
    business_name: shopMatch?.[1]?.trim(),
    phone_number: normalizedPhone,
    location: locationMatch?.[1]?.trim(),
    business_type,
    payment_method_used,
  };
}

function signupUrl(fields: {
  business_name?: string;
  phone_number?: string;
  business_type?: string;
}): string {
  const params = new URLSearchParams();
  if (fields.business_name) params.set("shop", fields.business_name.slice(0, 80));
  if (fields.phone_number) params.set("phone", fields.phone_number);
  if (fields.business_type) params.set("type", fields.business_type);
  const q = params.toString();
  return q ? `/signup?${q}` : "/signup";
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      history?: ChatMessage[];
      capture_lead?: boolean;
    };
    const message = String(body.message ?? "").trim().slice(0, 2000);
    if (message.length < 1) return jsonResponse({ error: "message required" }, 400);

    const history = Array.isArray(body.history)
      ? body.history
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
          .slice(-12)
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) }))
      : [];

    let result: BotResponse;

    const llm = await vercelAiChat({
      json: true,
      maxTokens: 650,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `You are the InuaBiz assistant embedded ON inuabiz.co.ke — the visitor is ALREADY on the site in this chat widget. CRITICAL: Never tell them to "visit the website", "go to inuabiz.co.ke", or "head over to the site". For signup: say tap "Start free trial" in this chat (or share shop name + phone to pre-fill). Steps: name, shop, email, OTP, then M-Pesa setup — ${TRIAL_DAYS}-day trial then KES ${SHOP_MONTHLY_KES}/shop/month. Pricing: KES ${SHOP_MONTHLY_KES}/shop/month, ${TRIAL_DAYS}-day trial. Explain Till, Pochi (Companion SMS), Paybill, personal M-Pesa using: ${JSON.stringify(PAYMENT_EXPLAINERS)}. Business tips: ${JSON.stringify(BUSINESS_HINTS)}. Reply JSON only: {reply: string, quick_replies: string[0-4], capture_lead: boolean, roi: {txPerDay?: number, shopCount?: number}|null}. Warm British English; Kiswahili/Sheng OK. Set capture_lead true when user wants signup or gives shop + phone. Never invent features (no WhatsApp support yet). Contact for enterprise: /contact or hello@inuabiz.co.ke — do not say "visit the site".`,
        },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    });

    if (llm) {
      try {
        const parsed = JSON.parse(llm.text) as {
          reply?: string;
          quick_replies?: string[];
          capture_lead?: boolean;
          roi?: { txPerDay?: number; shopCount?: number; monthlySalesKes?: number };
        };
        result = {
          reply: String(parsed.reply ?? "").trim() || heuristicReply(message, history).reply,
          quick_replies: parsed.quick_replies?.slice(0, 4),
        };
        if (parsed.roi) {
          result.roi = roiEstimate(parsed.roi);
          result.reply += ` ${result.roi.note}`;
        }
        if (parsed.capture_lead) body.capture_lead = true;
      } catch {
        result = { reply: llm.text.slice(0, 1200) };
      }
    } else {
      result = heuristicReply(message, history);
    }

    result.reply = polishReply(result.reply);

    if (isSignupIntent(message)) {
      result.signup_url = result.signup_url ?? signupUrl(extractLeadFields(history, message));
      if (!result.quick_replies?.some((q) => /start free trial/i.test(q))) {
        result.quick_replies = ["Start free trial", ...(result.quick_replies ?? [])].slice(0, 4);
      }
      if (!/start free trial/i.test(result.reply)) {
        result.reply += " Tap Start free trial below to begin.";
      }
    }

    const leadFields = extractLeadFields(history, message);
    const shouldSave =
      body.capture_lead ||
      message.toLowerCase().includes("start free trial") ||
      (leadFields.business_name && leadFields.phone_number);

    if (shouldSave && (leadFields.phone_number || leadFields.business_name)) {
      const service = getServiceClient();
      const summary = [...history, { role: "user" as const, content: message }]
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
        .slice(0, 4000);

      const { data: lead } = await service
        .from("landing_bot_leads")
        .insert({
          business_name: leadFields.business_name ?? null,
          phone_number: leadFields.phone_number ?? null,
          location: leadFields.location ?? null,
          business_type: leadFields.business_type ?? null,
          payment_method_used: leadFields.payment_method_used ?? null,
          chat_summary: summary,
          metadata: { last_message: message },
        })
        .select("id")
        .single();

      if (lead?.id) {
        result.lead_id = lead.id as string;
        result.signup_url = signupUrl(leadFields);
        if (!result.reply.toLowerCase().includes("signup") && !result.reply.toLowerCase().includes("trial")) {
          result.reply += " Tap Start free trial — we'll pre-fill your shop details.";
        }
      }
    }

    if (message.toLowerCase().includes("start free trial") && !result.signup_url) {
      result.signup_url = signupUrl(leadFields);
    }

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
