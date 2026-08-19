import { createServerFn } from "@tanstack/react-start";

type ChatMessage = { role: string; content: string };

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

/**
 * Server-only proxy to the WYA Vercel AI Gateway. The API key never leaves the server.
 */
export const askAi = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { messages: ChatMessage[]; maxTokens?: number; json?: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["VERCEL_AI_API_KEY"]?.trim();
    if (!apiKey) {
      throw new Error("AI gateway not configured (missing VERCEL_AI_API_KEY)");
    }

    const model = process.env["VERCEL_AI_GATEWAY_MODEL"]?.trim() || DEFAULT_MODEL;
    const body: Record<string, unknown> = {
      model,
      messages: data.messages,
      max_tokens: data.maxTokens ?? 700,
    };
    if (data.json) {
      body["response_format"] = { type: "json_object" };
    }

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await upstream.text();
    let parsed: {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error("Invalid JSON from AI gateway");
    }

    if (!upstream.ok) {
      throw new Error(parsed.error?.message || `Gateway error ${upstream.status}`);
    }

    const text = parsed.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("Empty model response");
    return { text };
  });
