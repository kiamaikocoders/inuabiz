import { insights as mockInsights, KES, products, type Insight } from "@/lib/mock-data";
import { askAi } from "@/lib/ai-server";
import { invokeFunction } from "@/lib/supabase";

type EdgeInsight = {
  ok?: boolean;
  cached?: boolean;
  insight?: {
    model?: string;
    payload?: {
      revenue_kes?: number;
      sale_count?: number;
      bestsellers?: Array<{ name: string; qty: number; revenue: number }>;
      reorder_suggestions?: Array<{ product: string; stock_qty: number }>;
      cashflow_note?: string;
      llm?: { summary?: string; actions?: string[]; risks?: string[] };
    };
  };
};

function heuristicUserPrompt(): string {
  const low = products.filter((p) => p.stock <= p.reorderLevel);
  return JSON.stringify({
    currency: "KES",
    shop: "Kenyan duka",
    weekly_sales: 79600,
    low_stock: low.map((p) => ({ name: p.name, stock: p.stock, reorder: p.reorderLevel })),
    movers: products.slice(0, 5).map((p) => ({ name: p.name, price: p.price })),
  });
}

function fromLlmJson(raw: string, model: string): Insight[] {
  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      actions?: string[];
      risks?: string[];
    };
    const out: Insight[] = [];
    if (parsed.summary) {
      out.push({
        id: "ai-summary",
        title: "This week's cash-flow read",
        body: parsed.summary,
        kind: "Forecast",
        confidence: 82,
      });
    }
    (parsed.actions ?? []).forEach((a, i) => {
      out.push({
        id: `ai-act-${i}`,
        title: a.slice(0, 72),
        body: a,
        kind: i === 0 ? "Reorder" : "Pricing",
        confidence: 74,
      });
    });
    (parsed.risks ?? []).forEach((r, i) => {
      out.push({
        id: `ai-risk-${i}`,
        title: r.slice(0, 72),
        body: r,
        kind: "Customer",
        confidence: 68,
      });
    });
    if (out.length) {
      out[0] = { ...out[0]!, title: `${out[0]!.title} · ${model}` };
      return out.slice(0, 6);
    }
  } catch {
    /* fall through */
  }
  return [
    {
      id: "ai-raw",
      title: "AI advisory",
      body: raw,
      kind: "Forecast",
      confidence: 70,
    },
  ];
}

function fromEdge(payload: NonNullable<EdgeInsight["insight"]>["payload"], model: string): Insight[] {
  if (!payload) return mockInsights;
  const llm = payload.llm;
  if (llm?.summary) {
    return fromLlmJson(JSON.stringify(llm), model);
  }
  const cards: Insight[] = [];
  if (payload.cashflow_note) {
    cards.push({
      id: "cf",
      title: `Last 7 days · ${KES(payload.revenue_kes ?? 0)}`,
      body: payload.cashflow_note,
      kind: "Forecast",
      confidence: 90,
    });
  }
  for (const r of payload.reorder_suggestions ?? []) {
    cards.push({
      id: `re-${r.product}`,
      title: `Restock ${r.product}`,
      body: `Only ${r.stock_qty} left. Order before the weekend rush.`,
      kind: "Reorder",
      confidence: 86,
    });
  }
  return cards.length ? cards : mockInsights;
}

export async function generateLiveInsights(): Promise<{
  items: Insight[];
  source: "supabase" | "gateway" | "demo";
  model: string;
}> {
  const edge = await invokeFunction<EdgeInsight>("generate-ai-insights", {
    insight_type: "weekly_overview",
  });
  if (edge.data?.insight?.payload) {
    const model = edge.data.insight.model ?? "generate-ai-insights";
    return {
      items: fromEdge(edge.data.insight.payload, model),
      source: "supabase",
      model,
    };
  }

  try {
    const res = await askAi({
      data: {
        messages: [
          {
            role: "system",
            content:
              "You are a Kenyan MSME retail advisor for dukas. Reply with JSON only: {summary, actions: string[], risks: string[]}. Use KES. Keep under 120 words total.",
          },
          { role: "user", content: heuristicUserPrompt() },
        ],
        maxTokens: 500,
      },
    });
    return {
      items: fromLlmJson(res.text, "gemini-2.5-flash"),
      source: "gateway",
      model: "gemini-2.5-flash",
    };
  } catch {
    return { items: mockInsights, source: "demo", model: "demo" };
  }
}
