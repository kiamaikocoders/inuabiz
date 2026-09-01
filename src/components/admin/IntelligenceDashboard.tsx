import { useMemo, useState } from "react";
import * as Sentry from "@sentry/tanstackstart-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Info,
  LineChart,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  cohortSparkline,
  cohortWowDelta,
  SCENARIOS,
  shortWeekLabel,
  simulateFunnel,
  type ProductIntelligence,
  type ScenarioId,
} from "@/lib/admin-intelligence";
import { clarityConfigured, sentryConfigured } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

const STAGE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-3)",
  "var(--color-chart-2)",
  "var(--color-chart-5)",
  "var(--color-chart-4)",
];

type Props = {
  data: ProductIntelligence | undefined;
  windowLabel: string;
};

export function IntelligenceDashboard({ data, windowLabel }: Props) {
  const [scenario, setScenario] = useState<ScenarioId>("healthy");
  const [landingPct, setLandingPct] = useState(75);
  const [formPct, setFormPct] = useState(80);
  const [verifyPct, setVerifyPct] = useState(90);
  const [cohortMetric, setCohortMetric] = useState<"signed_up" | "activated">("signed_up");

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

  const cohorts = data?.cohorts ?? [];
  const funnel = data?.funnel ?? [];
  const pages = data?.pages ?? [];
  const maxPageViews = Math.max(1, ...pages.map((p) => p.views));

  const funnelBars = funnel.map((s, i) => ({
    stage: s.label.replace(/ signup| view| submit| sale/gi, "").trim() || s.label,
    count: s.count,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  const cohortBars = cohorts.map((c) => ({
    week: shortWeekLabel(c.week_start),
    signed_up: c.signed_up,
    completed: c.completed,
    activated: c.activated,
    highlight: cohortMetric === "signed_up" ? c.signed_up : c.activated,
  }));

  const stageDonut = funnel
    .filter((s) => s.count > 0)
    .map((s, i) => ({
      name: s.label.split(" ")[0] ?? s.label,
      value: s.count,
      fill: STAGE_COLORS[i % STAGE_COLORS.length],
    }));

  return (
    <div className="space-y-6">
      {/* KPI row with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSparkCard
          label="Final conversion"
          value={`${data?.kpis.final_conversion_pct ?? 0}%`}
          delta={cohortWowDelta(cohorts, "activated")}
          deltaHint="vs prior week"
          series={cohortSparkline(cohorts, "activated")}
          positiveIsGood
        />
        <KpiSparkCard
          label="Activated shops"
          value={String(data?.kpis.successful_signups ?? 0)}
          delta={cohortWowDelta(cohorts, "activated")}
          deltaHint="vs prior week"
          series={cohortSparkline(cohorts, "activated")}
          positiveIsGood
        />
        <KpiSparkCard
          label="Lost to issues"
          value={String(data?.kpis.lost_to_issues ?? 0)}
          delta={null}
          deltaHint={`${data?.issue_counts.email_failures ?? 0} email · ${data?.issue_counts.payment_failures ?? 0} payment`}
          series={cohortSparkline(cohorts, "completed")}
          positiveIsGood={false}
        />
        <KpiSparkCard
          label="Stuck in onboarding"
          value={String(data?.kpis.stuck_in_onboarding ?? 0)}
          delta={cohortWowDelta(cohorts, "signed_up")}
          deltaHint="signup velocity"
          series={cohortSparkline(cohorts, "signed_up")}
          positiveIsGood={false}
        />
      </div>

      {/* Main charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="surface-card p-5 xl:col-span-2">
          <ChartCardHeader
            title="Signup funnel overview"
            subtitle={`${data?.kpis.signed_up ?? 0} signed up · ${data?.kpis.final_conversion_pct ?? 0}% to first sale`}
            action={
              <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs">
                {windowLabel} <ChevronDown className="size-3.5" />
              </Button>
            }
          />
          <div className="mt-6 h-64">
            {funnelBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelBars} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const row = payload[0].payload as { stage: string; count: number };
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold">{row.stage}</p>
                          <p className="text-muted-foreground mt-0.5 tabular-nums">
                            {row.count.toLocaleString()} vendors
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {funnelBars.map((entry) => (
                      <Cell key={entry.stage} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No funnel data for this window yet." />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {(data?.dropoffs ?? []).map((d) =>
              d.lost > 0 ? (
                <span
                  key={`${d.from}-${d.to}`}
                  className="bg-destructive/8 text-destructive rounded-full px-2.5 py-1 text-[11px] font-medium"
                >
                  −{d.lost} ({d.rate_pct}%) {d.from} → {d.to}
                </span>
              ) : null,
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <ChartCardHeader
            title="Weekly signups"
            subtitle={`${cohortBars.at(-1)?.signed_up ?? 0} this week`}
            action={
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs"
                onClick={() =>
                  setCohortMetric((m) => (m === "signed_up" ? "activated" : "signed_up"))
                }
              >
                {cohortMetric === "signed_up" ? "Signups" : "Activated"}{" "}
                <ChevronDown className="size-3.5" />
              </Button>
            }
          />
          <div className="mt-6 h-64">
            {cohortBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortBars} margin={{ left: -16, right: 4, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as (typeof cohortBars)[0];
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-muted-foreground mt-1">
                            {row.signed_up} signed · {row.activated} activated
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="highlight" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {cohortBars.map((entry, i) => (
                      <Cell
                        key={entry.week}
                        fill={
                          i === cohortBars.length - 1
                            ? "var(--color-chart-5)"
                            : "color-mix(in oklch, var(--color-chart-5) 28%, var(--color-muted))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Cohort bars appear after weekly signups." />
            )}
          </div>
        </div>
      </div>

      {/* Distribution + pages table */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <ChartCardHeader
            title="Stage distribution"
            subtitle="Share of vendors at each funnel step"
          />
          <div className="mt-2 flex flex-col items-center sm:flex-row sm:gap-6">
            <div className="h-52 w-full sm:w-[220px]">
              {stageDonut.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageDonut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {stageDonut.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox)) return null;
                          const total = stageDonut.reduce((s, d) => s + d.value, 0);
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) - 4}
                                className="fill-foreground text-lg font-bold"
                              >
                                {total.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 14}
                                className="fill-muted-foreground text-[10px]"
                              >
                                in funnel
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const row = payload[0].payload as (typeof stageDonut)[0];
                        return (
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
                            {row.name}: {row.value.toLocaleString()}
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No stage split yet." />
              )}
            </div>
            <ul className="flex-1 space-y-3 pt-2">
              {stageDonut.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: s.fill }}
                    />
                    {s.name}
                  </span>
                  <span className="tabular-nums font-semibold">{s.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="surface-card overflow-hidden p-5">
          <ChartCardHeader title="Top pages" subtitle="Product event page_view counts" />
          <Table className="mt-4">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Path</TableHead>
                <TableHead className="text-right text-xs">Views</TableHead>
                <TableHead className="hidden w-[120px] sm:table-cell text-xs">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.slice(0, 6).map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="max-w-[180px] truncate font-mono text-xs">{p.path}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {p.views.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-[var(--color-chart-5)]"
                          style={{ width: `${(p.views / maxPageViews) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right text-[10px] tabular-nums">
                        {Math.round((p.views / maxPageViews) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!pages.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                    No page_view events — browse the site after deploying ingest-product-event.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* What-if simulator */}
      <div className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary size-4" />
              <h3 className="font-display text-lg font-semibold">What-if drop-off simulator</h3>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Stress form or SMS verify against live volume ({baselineTraffic.toLocaleString()}{" "}
              signups).
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
              className="rounded-full"
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
          <SimMetric label="Final conversion" value={`${sim.finalPct}%`} tone="default" />
          <SimMetric
            label="Successful signups"
            value={sim.converted.toLocaleString()}
            tone="success"
          />
          <SimMetric
            label="Lost to issues"
            value={sim.lostToIssues.toLocaleString()}
            tone="danger"
          />
        </div>

        <div className="mt-6 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sim.stages.map((s) => ({ stage: s.label.split(" ")[0], count: s.count }))}
              margin={{ left: -12, right: 8, top: 4 }}
            >
              <defs>
                <linearGradient id="simFunnel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-chart-5)"
                strokeWidth={2}
                fill="url(#simFunnel)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <SimSlider label="Landing page conv. %" value={landingPct} onChange={setLandingPct} />
          <SimSlider label="Form submission conv. %" value={formPct} onChange={setFormPct} />
          <SimSlider label="Verification completion %" value={verifyPct} onChange={setVerifyPct} />
          <p className="text-muted-foreground self-end text-xs leading-relaxed">
            Scenario adds form error {activeScenario.formErrorPct}% · verify fail{" "}
            {activeScenario.verifyFailPct}% on top of your sliders.
          </p>
        </div>
      </div>

      {/* Issues + monitoring stack */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-4" />
            <h3 className="font-display font-semibold">Technical friction</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Email DLQ {data?.issue_counts.email_failures ?? 0} · Payment fails{" "}
            {data?.issue_counts.payment_failures ?? 0}
          </p>
          <ul className="mt-4 max-h-[280px] space-y-2 overflow-y-auto">
            {(data?.issues ?? []).slice(0, 8).map((issue, idx) => (
              <li
                key={`${issue.at}-${idx}`}
                className="hover:bg-muted/50 flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{issue.title}</p>
                  {issue.detail ? (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{issue.detail}</p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {new Date(issue.at).toLocaleString("en-KE")}
                  </p>
                </div>
                {issue.href ? (
                  <a href={issue.href} className="text-primary shrink-0 text-xs font-medium">
                    Open
                  </a>
                ) : null}
              </li>
            ))}
            {!data?.issues.length ? (
              <li className="text-muted-foreground py-6 text-center text-sm">
                No technical issues in this window.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <Shield className="text-primary size-4" />
            <h3 className="font-display font-semibold">Replay & error stack</h3>
          </div>
          <Table className="mt-4">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Integration</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Health</TableHead>
                <TableHead className="text-right text-xs">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <IntegrationRow
                name="Sentry"
                type="Errors & replay"
                ok={sentryConfigured()}
                href="https://inuabiz.sentry.io"
              />
              <IntegrationRow
                name="Microsoft Clarity"
                type="Heatmaps"
                ok={clarityConfigured()}
                href="https://clarity.microsoft.com"
              />
            </TableBody>
          </Table>
          {import.meta.env.DEV ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-full"
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
      </div>

      {/* Cohort table */}
      <div className="surface-card overflow-hidden p-5">
        <ChartCardHeader title="Weekly signup cohorts" subtitle="Retention by signup week" />
        <Table className="mt-4">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Week</TableHead>
              <TableHead className="text-right">Signed up</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Activated</TableHead>
              <TableHead className="text-right">Retained</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.map((c) => (
              <TableRow key={c.week_start}>
                <TableCell className="font-medium">{shortWeekLabel(c.week_start)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.signed_up}</TableCell>
                <TableCell className="text-right tabular-nums">{c.completed}</TableCell>
                <TableCell className="text-right tabular-nums">{c.activated}</TableCell>
                <TableCell className="text-right tabular-nums">{c.retained}</TableCell>
              </TableRow>
            ))}
            {!cohorts.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                  No cohort rows yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ChartCardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Info className="text-muted-foreground size-3.5" />
        </div>
        {subtitle ? <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function KpiSparkCard({
  label,
  value,
  delta,
  deltaHint,
  series,
  positiveIsGood = true,
}: {
  label: string;
  value: string;
  delta: number | null;
  deltaHint?: string;
  series: Array<{ i: number; v: number }>;
  positiveIsGood?: boolean;
}) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta ? delta >= 0 : true;
  const good = positiveIsGood ? up : !up;
  const sparkData = series.length ? series : [{ i: 0, v: 0 }, { i: 1, v: 0 }];

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <Info className="text-muted-foreground size-3.5 shrink-0" />
      </div>
      <p className="font-display mt-2 text-[26px] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                good ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta!).toLocaleString()}
              {typeof delta === "number" && Math.abs(delta) <= 100 ? "%" : ""}
            </span>
          ) : null}
          {deltaHint ? (
            <p className="text-muted-foreground mt-1 text-[10px]">{deltaHint}</p>
          ) : null}
        </div>
        <div className="h-10 w-[88px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={good ? "var(--color-success)" : "var(--color-destructive)"}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={good ? "var(--color-success)" : "var(--color-destructive)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={good ? "var(--color-success)" : "var(--color-destructive)"}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SimMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "danger";
}) {
  return (
    <div className="bg-muted/40 rounded-xl px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "font-display mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
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
        <span className="tabular-nums font-medium">{value}%</span>
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

function IntegrationRow({
  name,
  type,
  ok,
  href,
}: {
  name: string;
  type: string;
  ok: boolean;
  href: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{type}</p>
      </TableCell>
      <TableCell>
        <Badge variant={ok ? "secondary" : "outline"}>{ok ? "Connected" : "Setup"}</Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="bg-muted h-1.5 w-full max-w-[100px] overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full", ok ? "bg-success w-full" : "bg-muted-foreground/30 w-1/3")}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs font-medium"
        >
          Open <ExternalLink className="size-3" />
        </a>
      </TableCell>
    </TableRow>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
      <LineChart className="size-8 opacity-40" />
      {label}
    </div>
  );
}
