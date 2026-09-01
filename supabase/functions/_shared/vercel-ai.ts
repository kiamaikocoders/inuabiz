import { resolveSecret } from "./daraja.ts";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export type VercelAiMessage = { role: string; content: string };

/**
 * Call the Vercel AI Gateway from Edge Functions.
 * Uses VERCEL_AI_API_KEY (env or app_secrets). Returns null when not configured.
 */
export async function vercelAiChat(input: {
  messages: VercelAiMessage[];
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<{ text: string; model: string } | null> {
  const apiKey = (await resolveSecret("VERCEL_AI_API_KEY"))?.trim();
  if (!apiKey) return null;

  const model =
    (await resolveSecret("VERCEL_AI_GATEWAY_MODEL"))?.trim() || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    messages: input.messages,
    max_tokens: input.maxTokens ?? 700,
    temperature: input.temperature ?? 0.2,
  };
  if (input.json) {
    body["response_format"] = { type: "json_object" };
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: {
    choices?: Array<{ message?: { content?: string | null } }>;
    model?: string;
    error?: { message?: string };
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Invalid JSON from AI gateway");
  }

  if (!res.ok) {
    throw new Error(parsed.error?.message || `Gateway error ${res.status}`);
  }

  const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Empty model response");
  return { text, model: parsed.model ?? model };
}
