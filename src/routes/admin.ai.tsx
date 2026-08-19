import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Brain,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KES } from "@/lib/mock-data";
import {
  askAdminCopilot,
  buildPlatformSnapshot,
  fetchAiSpendThisMonth,
  runAdminBriefing,
  type AdminBriefing,
} from "@/lib/admin-ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({
    meta: [
      { title: "Admin AI — InuaBiz command copilot" },
      {
        name: "description",
        content:
          "Platform briefing, churn radar, unclaimed-payment matching and an operator copilot for the InuaBiz super-admin.",
      },
    ],
  }),
  component: AdminAi,
});

type ChatTurn = { role: "user" | "assistant"; content: string };

function AdminAi() {
  const snap = buildPlatformSnapshot();
  const [briefing, setBriefing] = useState<AdminBriefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [spend, setSpend] = useState({ runs: 0, costKes: 0 });
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    void fetchAiSpendThisMonth().then(setSpend);
  }, [briefing, chat.length]);

  const generate = () => {
    setBusy(true);
    void runAdminBriefing()
      .then((b) => {
        setBriefing(b);
        toast.success("Briefing ready", {
          description: b.source === "gateway" ? `Model ${b.model}` : "Heuristic fallback",
        });
      })
      .catch((err: unknown) =>
        toast.error("Briefing failed", {
          description: err instanceof Error ? err.message : "Try again",
        }),
      )
      .finally(() => setBusy(false));
  };

  const sendChat = () => {
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    const history = [...chat, { role: "user" as const, content: q }];
    setChat(history);
    setAsking(true);
    void askAdminCopilot(q, chat)
      .then((answer) => setChat([...history, { role: "assistant", content: answer }]))
      .catch((err: unknown) =>
        toast.error("Copilot failed", {
          description: err instanceof Error ? err.message : "Try again",
        }),
      )
      .finally(() => setAsking(false));
  };

  return (
    <AdminShell
      title="Admin AI"
      description="Platform briefing, churn radar and operator copilot"
      actions={
        <Button
          size="sm"
          variant="ink"
          className="hidden rounded-[10px] sm:inline-flex"
          onClick={generate}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {briefing ? "Refresh briefing" : "Run briefing"}
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paying MRR" value={KES(snap.mrrKes)} icon={Wallet} tone="violet" />
        <StatCard
          label="Vendors needing a human"
          value={String(snap.attention.length + snap.trials.length)}
          icon={AlertTriangle}
          tone="gold"
        />
        <StatCard
          label="Unclaimed cash"
          value={KES(snap.unclaimed.valueKes)}
          icon={Banknote}
          tone="danger"
        />
        <StatCard
          label="Admin AI this month"
          value={KES(Math.round(spend.costKes) || 0)}
          hint={`${spend.runs} logged runs`}
          icon={Brain}
          tone="teal"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-primary">
                <Sparkles className="size-3.5" /> Daily ops briefing
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {briefing?.headline ?? "Run the copilot against live platform state"}
              </h2>
            </div>
            <Badge variant="outline">{briefing?.model ?? "idle"}</Badge>
          </div>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {briefing?.summary ??
              "This is not shop-level cash-flow AI. It reads MRR, trials, GIS density, webhook health and the unclaimed queue, then tells you what to do before lunch."}
          </p>
          {briefing && (
            <ul className="mt-4 space-y-2 text-sm">
              {briefing.briefingPoints.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={generate} disabled={busy} className="sm:hidden">
              {busy ? "Thinking…" : "Run briefing"}
            </Button>
            {(briefing?.actions ?? []).map((a) => (
              <Button key={a.href} size="sm" variant="outline" asChild>
                <Link to={a.href as never}>
                  {a.title} <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Why this exists</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Vendor AI (`/app/insights`) forecasts sugar and cash-flow. Admin AI runs the SaaS:
            who is about to churn, which M-Pesa webhook is orphaned, what to broadcast, and a
            brief before you impersonate.
          </p>
          <ul className="text-muted-foreground mt-4 space-y-2 text-xs">
            <li>Gateway: WYA Vercel AI (Gemini) — key never in the browser</li>
            <li>Ledger: `admin_ai_runs` (super-admin RLS)</li>
            <li>Vendor cache: `ai_insights` + `generate-ai-insights`</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-semibold">Churn & support radar</h2>
          <div className="mt-4 space-y-3">
            {(briefing?.atRisk ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">Run a briefing to rank at-risk tenants.</p>
            )}
            {(briefing?.atRisk ?? []).map((v) => (
              <Link
                key={v.id}
                to="/admin/tenants/$tenantId"
                params={{ tenantId: v.id }}
                className="block rounded-xl border border-border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{v.business}</p>
                  <Badge
                    variant={v.severity === "high" ? "destructive" : "secondary"}
                    className="capitalize"
                  >
                    {v.severity}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{v.reason}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Unclaimed match suggestions</h2>
          <div className="mt-4 space-y-3">
            {(briefing?.unclaimedMatches ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">
                The copilot will propose tenant matches from phone fragments and api_ref noise.
              </p>
            )}
            {(briefing?.unclaimedMatches ?? []).map((m) => (
              <div key={m.paymentId} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{m.business}</span>
                  <span className="text-muted-foreground text-xs">{m.confidence}% match</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{m.reason}</p>
                <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" asChild>
                  <Link to="/admin/unclaimed">Open queue</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">Ask the platform</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Questions like “who converts this week?” or “why is MRR stuck?” — grounded in the live
          snapshot, not the open web.
        </p>
        <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
          {chat.map((t, i) => (
            <div
              key={`${t.role}-${i}`}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                t.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {t.content}
            </div>
          ))}
          {asking && <p className="text-muted-foreground text-xs">Thinking…</p>}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendChat();
          }}
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which trials should we call today?"
          />
          <Button type="submit" disabled={asking || !question.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </AdminShell>
  );
}
