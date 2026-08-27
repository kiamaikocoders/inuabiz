import { KES, type Insight } from "@/lib/mock-data";
import { askAi } from "@/lib/ai-server";
import { invokeFunction } from "@/lib/supabase";
import { fetchCashflowWeeks, fetchProducts, fetchTodaySales, type CashflowPoint } from "@/lib/data";

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

export type LiveInsights = {
  items: Insight[];
  source: "supabase" | "gateway" | "heuristic";
  model: string;
  revenueKes: number;
  saleCount: number;
  bestsellers: Array<{ name: string; qty: number; revenue: number }>;
  reorderCount: number;
  cashflow: CashflowPoint[];
};

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
  const trimmed = raw.trim();
  if (!trimmed) return [];
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

function fromHeuristicPayload(
  payload: NonNullable<EdgeInsight["insight"]>["payload"],
  model: string,
): Insight[] {
  if (!payload) return [];
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
  return cards;
}

async function shopPrompt(): Promise<string> {
  const [products, today] = await Promise.all([fetchProducts(), fetchTodaySales()]);
  const low = products.filter((p) => p.stock <= p.reorderLevel);
  return JSON.stringify({
    currency: "KES",
    shop: "Kenyan duka",
    sales_today_kes: today.total,
    sales_today_count: today.count,
    sales_yesterday_kes: today.yesterday,
    catalog_size: products.length,
    low_stock: low.map((p) => ({ name: p.name, stock: p.stock, reorder: p.reorderLevel })),
    movers: products.slice(0, 8).map((p) => ({ name: p.name, price: p.price, stock: p.stock })),
  });
}

export async function generateLiveInsights(): Promise<LiveInsights> {
  const cashflow = await fetchCashflowWeeks(4).catch(() => [] as CashflowPoint[]);
  const edge = await invokeFunction<EdgeInsight>("generate-ai-insights", {
    insight_type: "weekly_overview",
  });
  const payload = edge.data?.insight?.payload;
  if (payload) {
    const model = edge.data?.insight?.model ?? "generate-ai-insights";
    return {
      items: fromHeuristicPayload(payload, model),
      source: "supabase",
      model,
      revenueKes: payload.revenue_kes ?? 0,
      saleCount: payload.sale_count ?? 0,
      bestsellers: payload.bestsellers ?? [],
      reorderCount: payload.reorder_suggestions?.length ?? 0,
      cashflow,
    };
  }

  try {
    const prompt = await shopPrompt();
    const res = await askAi({
      data: {
        messages: [
          {
            role: "system",
            content:
              "You are a Kenyan MSME retail advisor for dukas. Reply with JSON only: {summary, actions: string[], risks: string[]}. Use KES. Keep under 120 words total. If there is no sales data, say so plainly — do not invent SKUs or revenue.",
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 500,
        json: true,
      },
    });
    const products = await fetchProducts();
    const today = await fetchTodaySales();
    const low = products.filter((p) => p.stock <= p.reorderLevel);
    return {
      items: fromLlmJson(res.text, "gemini-2.5-flash"),
      source: "gateway",
      model: "gemini-2.5-flash",
      revenueKes: today.total,
      saleCount: today.count,
      bestsellers: [],
      reorderCount: low.length,
      cashflow,
    };
  } catch {
    const products = await fetchProducts().catch(() => []);
    const today = await fetchTodaySales().catch(() => ({ total: 0, count: 0, yesterday: 0 }));
    const low = products.filter((p) => p.stock <= p.reorderLevel);
    const items: Insight[] = [];
    if (today.total > 0) {
      items.push({
        id: "cf-live",
        title: `Today · ${KES(today.total)}`,
        body: `${today.count} paid sales today. Yesterday was ${KES(today.yesterday)}.`,
        kind: "Forecast",
        confidence: 95,
      });
    }
    for (const p of low.slice(0, 4)) {
      items.push({
        id: `re-${p.id}`,
        title: `Restock ${p.name}`,
        body: `Only ${p.stock} left (reorder at ${p.reorderLevel}).`,
        kind: "Reorder",
        confidence: 88,
      });
    }
    return {
      items,
      source: "heuristic",
      model: "heuristic-v1",
      revenueKes: today.total,
      saleCount: today.count,
      bestsellers: [],
      reorderCount: low.length,
      cashflow,
    };
  }
}
