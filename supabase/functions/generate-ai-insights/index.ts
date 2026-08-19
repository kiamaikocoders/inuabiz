import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

/**
 * Cached weekly AI insights for a tenant (cash-flow / bestsellers / reorder).
 * Requires OPENAI_API_KEY (or ANTHROPIC_API_KEY). Falls back to heuristic summary
 * when no LLM key is set so POS never blocks on AI.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = getUserClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const insightType = (body.insight_type as string) ?? "weekly_overview";

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: "No tenant" }, 400);
    }

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    const startIso = periodStart.toISOString().slice(0, 10);
    const endIso = periodEnd.toISOString().slice(0, 10);

    const { data: cached } = await service
      .from("ai_insights")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("insight_type", insightType)
      .eq("period_start", startIso)
      .eq("period_end", endIso)
      .maybeSingle();

    if (cached) {
      return jsonResponse({ ok: true, cached: true, insight: cached });
    }

    const { data: sales } = await service
      .from("sales")
      .select("id, total, paid_at, status")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "PAID")
      .gte("paid_at", periodStart.toISOString())
      .lte("paid_at", periodEnd.toISOString());

    const { data: products } = await service
      .from("products")
      .select("id, name, stock_qty, low_stock_threshold, selling_price, cost_price")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true);

    const revenue = (sales ?? []).reduce((s, row) => s + Number(row.total), 0);
    const lowStock = (products ?? []).filter(
      (p) => Number(p.stock_qty) <= Number(p.low_stock_threshold),
    );

    const { data: items } = await service
      .from("sale_items")
      .select("product_id, product_name, qty, line_total")
      .eq("tenant_id", profile.tenant_id)
      .in(
        "sale_id",
        (sales ?? []).map((s) => s.id),
      );

    const byProduct = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();
    for (const it of items ?? []) {
      const key = it.product_id as string;
      const cur = byProduct.get(key) ?? {
        name: it.product_name as string,
        qty: 0,
        revenue: 0,
      };
      cur.qty += Number(it.qty);
      cur.revenue += Number(it.line_total);
      byProduct.set(key, cur);
    }

    const bestsellers = [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const heuristic = {
      period: { start: startIso, end: endIso },
      revenue_kes: revenue,
      sale_count: sales?.length ?? 0,
      avg_ticket: sales?.length ? revenue / sales.length : 0,
      bestsellers,
      reorder_suggestions: lowStock.map((p) => ({
        product: p.name,
        stock_qty: p.stock_qty,
        threshold: p.low_stock_threshold,
        suggested_order: Math.max(
          Number(p.low_stock_threshold) * 2 - Number(p.stock_qty),
          0,
        ),
      })),
      cashflow_note:
        revenue > 0
          ? `You took in KES ${revenue.toFixed(0)} over the last 7 days across ${sales?.length ?? 0} sales.`
          : "No paid sales in the last 7 days. Focus on restocking movers and clearing credit.",
    };

    let payload: Record<string, unknown> = heuristic;
    let model = "heuristic-v1";

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "You are a Kenyan MSME retail advisor. Reply with concise JSON: {summary, actions: string[], risks: string[]}. Use KES. Keep under 120 words total.",
              },
              {
                role: "user",
                content: JSON.stringify(heuristic),
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (llmRes.ok) {
          const llmJson = await llmRes.json();
          const content = llmJson.choices?.[0]?.message?.content;
          payload = {
            ...heuristic,
            llm: content ? JSON.parse(content) : null,
          };
          model = llmJson.model ?? "openai";
        }
      } catch (e) {
        console.error("LLM failed, using heuristic", e);
      }
    }

    const { data: inserted, error: insertErr } = await service
      .from("ai_insights")
      .insert({
        tenant_id: profile.tenant_id,
        insight_type: insightType,
        period_start: startIso,
        period_end: endIso,
        payload,
        model,
      })
      .select("*")
      .single();

    if (insertErr) {
      // race: another request cached it
      const { data: again } = await service
        .from("ai_insights")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("insight_type", insightType)
        .eq("period_start", startIso)
        .eq("period_end", endIso)
        .maybeSingle();
      if (again) return jsonResponse({ ok: true, cached: true, insight: again });
      throw insertErr;
    }

    return jsonResponse({ ok: true, cached: false, insight: inserted });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
