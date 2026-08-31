import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/tanstackstart-react";
import {
  AlertTriangle,
  ExternalLink,
  LineChart,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchProductIntelligence,
  SCENARIOS,
  simulateFunnel,
  type ScenarioId,
} from "@/lib/admin-intelligence";
import { clarityConfigured, sentryConfigured } from "@/lib/monitoring";
import { privateHead } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/intelligence")({
  head: () => privateHead("Product intelligence — InuaBiz admin"),
  component: Intelligence,
});

function Intelligence() {
  const live = isSupabaseConfigured();
  const [days, setDays] = useState(30);
  const [scenario, setScenario] = useState<ScenarioId>("healthy");
  const [landingPct, setLandingPct] = useState(75);
  const [formPct, setFormPct] = useState(80);
  const [verifyPct, setVerifyPct] = useState(90);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-product-intelligence", days],
    queryFn: () => fetchProductIntelligence(days),
    enabled: live,
    refetchInterval: 120_000,
  });

  const activeScenario = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0]!;
  const baselineTraffic = Math.max(data?.kpis.signed_up ?? 0, 50);

  const sim = useMemo(
    () =>
      simulateFunnel(
        baselineTraffic,
        landingPct,
        formPct,
        verifyPct,
        activeScenario.formErrorPct,
        activeScenario.verifyFailPct,
      ),
    [baselineTraffic, landingPct, formPct, verifyPct, activeScenario],
  );

  const maxFunnel = Math.max(1, ...(data?.funnel.map((s) => s.count) ?? [1]));
  const maxSim = Math.max(1, ...sim.stages.map((s) => s.count));

  return (
    <AdminShell
      title="Product intelligence"
      description="Signup funnel, drop-offs, cohort retention, and technical issue correlation."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
    >
      {!live ? (
        <p className="text-muted-foreground text-sm">Connect Supabase to load live funnel metrics.</p>
      ) : error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Could not load intelligence payload."} Apply
          the product_intelligence migration if this RPC is missing.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Final conversion"
          value={`${data?.kpis.final_conversion_pct ?? 0}%`}
          hint="Signup → first sale"
        />
        <StatCard
          label="Activated shops"
          value={String(data?.kpis.successful_signups ?? 0)}
          hint="Completed onboarding + sale"
        />
        <StatCard
          label="Lost to issues"
          value={String(data?.kpis.lost_to_issues ?? 0)}
          hint="Email + payment failures"
        />
        <StatCard
          label="Stuck in onboarding"
          value={String(data?.kpis.stuck_in_onboarding ?? 0)}
          hint={`Signed up last ${days}d, not finished`}
        />
      </div>

      {/* Live funnel */}
      <section className="mt-10">
        <div className="flex items-center gap-2">
          <LineChart className="text-primary size-4" />
          <h2 className="font-display text-lg font-semibold">Live signup funnel</h2>
          <Badge variant="secondary">{days} day window</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {(data?.funnel ?? []).map((stage, i) => {
            const drop = data?.dropoffs[i];
            return (
              <div key={stage.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="tabular-nums">{stage.count.toLocaleString()}</span>
                </div>
                <div className="bg-muted h-3 overflow-hidden rounded-full">
                  <div
                    className="from-primary to-success h-full rounded-full bg-gradient-to-r transition-all"
                    style={{ width: `${Math.max(4, (stage.count / maxFunnel) * 100)}%` }}
                  />
                </div>
                {drop && drop.lost > 0 ? (
                  <p className="text-destructive mt-1 text-xs">
                    −{drop.lost.toLocaleString()} ({drop.rate_pct}% drop to next stage)
                  </p>
                ) : null}
              </div>
            );
          })}
          {!data?.funnel.length ? (
            <p className="text-muted-foreground text-sm">No funnel rows yet for this window.</p>
          ) : null}
        </div>
      </section>

      {/* What-if simulator */}
      <section className="border-border mt-12 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">What-if drop-off simulator</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Starts from live signed-up volume ({baselineTraffic.toLocaleString()}). Stress form or
              SMS verify to see impact on conversions.
            </p>
          </div>
          {activeScenario.badge ? (
            <Badge variant="destructive">{activeScenario.badge}</Badge>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={scenario === s.id ? "default" : "outline"}
              onClick={() => {
                setScenario(s.id);
                if (s.id === "form_outage") setFormPct(30);
                if (s.id === "sms_drop") setVerifyPct(40);
                if (s.id === "healthy") {
                  setLandingPct(75);
                  setFormPct(80);
                  setVerifyPct(90);
                }
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Final conversion</p>
            <p className="font-display text-2xl font-bold tabular-nums">{sim.finalPct}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Successful signups</p>
            <p className="font-display text-success text-2xl font-bold tabular-nums">
              {sim.converted.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Lost to issues</p>
            <p className="font-display text-destructive text-2xl font-bold tabular-nums">
              {sim.lostToIssues.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {sim.stages.map((stage) => (
            <div key={stage.id} className="min-w-0">
              <p className="text-muted-foreground truncate text-xs">{stage.label}</p>
              <p className="font-display text-lg font-semibold tabular-nums">
                {stage.count.toLocaleString()}
              </p>
              <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                <div
                  className="from-primary to-success h-full rounded-full bg-gradient-to-r"
                  style={{ width: `${Math.max(6, (stage.count / maxSim) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <SimSlider label="Landing page target conv. %" value={landingPct} onChange={setLandingPct} />
          <SimSlider label="Form submission conv. %" value={formPct} onChange={setFormPct} />
          <SimSlider
            label="Verification completion %"
            value={verifyPct}
            onChange={setVerifyPct}
          />
          <div className="space-y-2">
            <p className="text-destructive text-sm font-medium">
              Form error rate {activeScenario.formErrorPct}% · Verify fail{" "}
              {activeScenario.verifyFailPct}%
            </p>
            <p className="text-muted-foreground text-xs">
              Error rates come from the selected scenario tab (matches ops friction overlays).
            </p>
          </div>
        </div>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* Pages */}
        <section>
          <h2 className="font-display text-lg font-semibold">Top pages (product events)</h2>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.pages ?? []).map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="font-mono text-xs">{p.path}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.views}</TableCell>
                </TableRow>
              ))}
              {!data?.pages.length ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground text-sm">
                    No page_view events yet — deploy ingest-product-event and browse the site.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </section>

        {/* Issues */}
        <section>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-4" />
            <h2 className="font-display text-lg font-semibold">Technical friction</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Email DLQ {data?.issue_counts.email_failures ?? 0} · Payment fails{" "}
            {data?.issue_counts.payment_failures ?? 0}
          </p>
          <ul className="mt-4 space-y-3">
            {(data?.issues ?? []).map((issue, idx) => (
              <li key={`${issue.at}-${idx}`} className="border-border rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{issue.title}</p>
                  {issue.href ? (
                    <a href={issue.href} className="text-primary shrink-0 text-xs">
                      Open
                    </a>
                  ) : null}
                </div>
                {issue.detail ? (
                  <p className="text-muted-foreground mt-1 text-xs">{issue.detail}</p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {new Date(issue.at).toLocaleString()}
                </p>
              </li>
            ))}
            {!data?.issues.length ? (
              <li className="text-muted-foreground text-sm">No technical issues in this window.</li>
            ) : null}
          </ul>
        </section>
      </div>

      {/* Cohorts */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold">Weekly signup cohorts</h2>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead className="text-right">Signed up</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Activated</TableHead>
              <TableHead className="text-right">Retained</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.cohorts ?? []).map((c) => (
              <TableRow key={c.week_start}>
                <TableCell>{c.week_start}</TableCell>
                <TableCell className="text-right tabular-nums">{c.signed_up}</TableCell>
                <TableCell className="text-right tabular-nums">{c.completed}</TableCell>
                <TableCell className="text-right tabular-nums">{c.activated}</TableCell>
                <TableCell className="text-right tabular-nums">{c.retained}</TableCell>
              </TableRow>
            ))}
            {!data?.cohorts.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-sm">
                  No cohort rows yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      {/* Integrations */}
      <section className="border-border mt-12 rounded-2xl border p-5">
        <div className="flex items-center gap-2">
          <Shield className="text-primary size-4" />
          <h2 className="font-display text-lg font-semibold">Replay & error stack</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <IntegrationCard
            title="Sentry"
            ok={sentryConfigured()}
            body="Errors, performance traces, and session replay (SDK wired). Set VITE_SENTRY_DSN / SENTRY_AUTH_TOKEN for source maps."
            href="https://inuabiz.sentry.io"
          />
          <IntegrationCard
            title="Microsoft Clarity"
            ok={clarityConfigured()}
            body="Free heatmaps and session recordings. Set VITE_CLARITY_PROJECT_ID to enable the Clarity snippet."
            href="https://clarity.microsoft.com"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {import.meta.env.DEV ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void (async () => {
                  try {
                    await Sentry.startSpan(
                      { name: "Example Frontend Span", op: "test" },
                      async () => {
                        const res = await fetch("/api/sentry-example");
                        if (!res.ok) throw new Error("Sentry Example Frontend Error");
                      },
                    );
                  } catch (err) {
                    Sentry.captureException(err);
                    toast.message("Sentry test fired", {
                      description: "Check Issues / Traces in the InuaBiz Sentry project.",
                    });
                  }
                })();
              }}
            >
              <Sparkles className="size-3.5" /> Test Sentry error
            </Button>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}

function SimSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <Slider
        min={5}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

function IntegrationCard({
  title,
  ok,
  body,
  href,
}: {
  title: string;
  ok: boolean;
  body: string;
  href: string;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant={ok ? "secondary" : "outline"}>{ok ? "Connected" : "Setup needed"}</Badge>
      </div>
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{body}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium"
      >
        Open <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
