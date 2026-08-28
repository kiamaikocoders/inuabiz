import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Database,
  Flag,
  Gauge,
  HardDrive,
  MailWarning,
  RefreshCw,
  ScrollText,
  Shield,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES } from "@/lib/mock-data";
import {
  cronLabel,
  cronTone,
  fetchOpsPulse,
  formatBytes,
  formatWhen,
  retryCronJob,
  retryFailedEmail,
  setFeatureFlag,
  type OpsPulse,
} from "@/lib/admin-ops";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [
      { title: "Ops command center — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Automated command center: subscriptions, cron audits, MRR pulse, dead-letter queues and audit logs.",
      },
      { property: "og:title", content: "InuaBiz ops command center" },
      {
        property: "og:description",
        content: "Cron, revenue, queues and audit in one place.",
      },
    ],
  }),
  component: Health,
});

function Health() {
  const live = isSupabaseConfigured();
  const qc = useQueryClient();
  const { data: pulse, isFetching, refetch } = useQuery({
    queryKey: ["admin-ops-pulse"],
    queryFn: fetchOpsPulse,
    enabled: live,
    refetchInterval: 60_000,
  });

  const retryCron = useMutation({
    mutationFn: retryCronJob,
    onSuccess: () => {
      toast.success("Cron queued");
      void qc.invalidateQueries({ queryKey: ["admin-ops-pulse"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const retryMail = useMutation({
    mutationFn: retryFailedEmail,
    onSuccess: () => {
      toast.success("Email retry queued");
      void qc.invalidateQueries({ queryKey: ["admin-ops-pulse"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const toggleFlag = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      setFeatureFlag(key, enabled),
    onSuccess: () => {
      toast.success("Flag updated");
      void qc.invalidateQueries({ queryKey: ["admin-ops-pulse"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cronAlert = (pulse?.cron ?? []).some((j) => cronTone(j) !== "Healthy");
  const dlqCount =
    (pulse?.dlq.emails.length ?? 0) +
    (pulse?.usage.unclaimed ?? 0) +
    (pulse?.usage.email_failed_24h ?? 0);

  return (
    <AdminShell
      title="Ops command center"
      description="Automation, cost guardrails, revenue pulse and trust — live from Postgres, not estimated."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-[10px]" asChild>
            <Link to="/admin/ai">
              <Sparkles className="size-3.5" /> Copilot
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ink"
            className="rounded-[10px]"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      }
    >
      {!pulse ? (
        <p className="text-muted-foreground text-sm">
          {live
            ? "Sign in as super-admin to load the live ops pulse."
            : "Supabase is not configured in this session."}
        </p>
      ) : (
        <PulseBody
          pulse={pulse}
          cronAlert={cronAlert}
          dlqCount={dlqCount}
          onRetryCron={(name) => retryCron.mutate(name)}
          cronBusy={retryCron.isPending}
          onRetryMail={(id) => retryMail.mutate(id)}
          mailBusy={retryMail.isPending}
          onToggleFlag={(key, enabled) => toggleFlag.mutate({ key, enabled })}
        />
      )}
    </AdminShell>
  );
}

function PulseBody({
  pulse,
  cronAlert,
  dlqCount,
  onRetryCron,
  cronBusy,
  onRetryMail,
  mailBusy,
  onToggleFlag,
}: {
  pulse: OpsPulse;
  cronAlert: boolean;
  dlqCount: number;
  onRetryCron: (name: string) => void;
  cronBusy: boolean;
  onRetryMail: (id: number) => void;
  mailBusy: boolean;
  onToggleFlag: (key: string, enabled: boolean) => void;
}) {
  const connPct = pulse.db.max_connections
    ? Math.round((pulse.db.connections / pulse.db.max_connections) * 100)
    : 0;
  const globalFlags = pulse.flags.filter((f) => !f.tenant_id);
  const audit = [...pulse.audit, ...pulse.ghost].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={KES(pulse.revenue.mrr_kes)}
          hint={`ARR ${KES(pulse.revenue.arr_kes)} · ARPU ${KES(pulse.revenue.arpu_kes)}`}
          icon={Wallet}
          tone="violet"
        />
        <StatCard
          label="Cron"
          value={cronAlert ? "Needs review" : "Healthy"}
          hint={`${pulse.cron.filter((j) => j.active).length} jobs · ${pulse.usage.edge_http_fail_24h} edge HTTP fails (24h)`}
          icon={Timer}
          tone={cronAlert ? "danger" : "success"}
        />
        <StatCard
          label="Dead letters"
          value={String(dlqCount)}
          hint={`${pulse.usage.unclaimed} unclaimed · ${pulse.usage.email_failed_24h} mail fails`}
          icon={MailWarning}
          tone={dlqCount ? "danger" : "teal"}
        />
        <StatCard
          label="Database"
          value={`${pulse.db.connections}/${pulse.db.max_connections}`}
          hint={`${formatBytes(pulse.db.size_bytes)} · ${pulse.db.long_queries} long queries`}
          icon={Database}
          tone={connPct > 70 || pulse.db.long_queries > 0 ? "gold" : "success"}
        />
      </div>

      <Tabs defaultValue="lifecycle" className="mt-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="lifecycle" className="rounded-full border">
            Lifecycle
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="rounded-full border">
            Guardrails
          </TabsTrigger>
          <TabsTrigger value="pulse" className="rounded-full border">
            Pulse
          </TabsTrigger>
          <TabsTrigger value="trust" className="rounded-full border">
            Trust
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lifecycle" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="font-semibold">Trials ending in 48h</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Retention mail already runs from dispatch-lifecycle. Extend or impersonate from the
                vendor record.
              </p>
              {pulse.trials_ending.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-sm">No trials that close in two days.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {pulse.trials_ending.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {t.hours_left}h left · {formatWhen(t.trial_ends_at)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/admin/tenants/$tenantId" params={{ tenantId: t.id }}>
                          Open
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="surface-card p-5">
              <h2 className="font-semibold">Feature flags</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Global toggles. Per-tenant overrides live on the vendor page.
              </p>
              <ul className="mt-4 space-y-3">
                {globalFlags.map((flag) => (
                  <li key={flag.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{flag.key}</p>
                      <p className="text-muted-foreground text-xs">{flag.description}</p>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(on) => onToggleFlag(flag.key, on)}
                      aria-label={`Toggle ${flag.key}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Paying vs at-risk</h2>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/admin/subscriptions">Subscriptions &amp; MRR</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                ["Active", pulse.revenue.active_tenants],
                ["Trials", pulse.revenue.trial_tenants],
                ["Past due", pulse.revenue.past_due_tenants],
                ["Suspended", pulse.revenue.suspended_tenants],
              ].map(([label, n]) => (
                <div key={String(label)} className="rounded-xl border border-border px-3 py-3">
                  <p className="text-muted-foreground text-[11px]">{label}</p>
                  <p className="font-display text-2xl font-bold">{n}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              {pulse.revenue.conversions_this_month} converted this month. Impersonation, trial
              extensions and custom amounts are on each vendor.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="guardrails" className="mt-4 space-y-4">
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <Timer className="size-4" /> Cron audit
              </h2>
              <StatusPill status={cronAlert ? "Degraded" : "Healthy"} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              pg_cron “succeeded” means the HTTP call was queued. Edge HTTP failures in the last 24h:{" "}
              {pulse.usage.edge_http_fail_24h}.
            </p>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Cadence</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead>24h</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pulse.cron.map((job) => (
                    <TableRow key={job.jobid}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {job.jobname}
                          <StatusPill status={cronTone(job)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cronLabel(job.schedule)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatWhen(job.last_run)}
                        {job.last_status ? ` · ${job.last_status}` : ""}
                      </TableCell>
                      <TableCell>
                        {job.runs_24h} runs
                        {job.fail_24h ? ` · ${job.fail_24h} fail` : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cronBusy}
                          onClick={() => onRetryCron(job.jobname)}
                        >
                          Run now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="mt-4 space-y-2 md:hidden">
              {pulse.cron.map((job) => (
                <li key={job.jobid} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{job.jobname}</p>
                    <StatusPill status={cronTone(job)} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {cronLabel(job.schedule)} · {formatWhen(job.last_run)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={cronBusy}
                    onClick={() => onRetryCron(job.jobname)}
                  >
                    Run now
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <Gauge className="size-4" /> Database
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Connections</dt>
                  <dd className="font-semibold">
                    {pulse.db.connections} / {pulse.db.max_connections} ({connPct}%)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Size</dt>
                  <dd className="font-semibold">{formatBytes(pulse.db.size_bytes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Queries &gt; 8s</dt>
                  <dd className="font-semibold">{pulse.db.long_queries}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">AI spend (month)</dt>
                  <dd className="font-semibold">
                    {KES(Math.round(pulse.usage.ai_spend_month_kes))} · {pulse.usage.ai_runs_month} runs
                  </dd>
                </div>
              </dl>
              <p className="text-muted-foreground mt-3 text-xs">
                CPU graphs live in the{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://supabase.com/dashboard/project/hnzzkmifgufurkqvnchp/reports/database"
                  target="_blank"
                  rel="noreferrer"
                >
                  Supabase report
                </a>
                . This card is live connections and size only.
              </p>
            </div>
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <HardDrive className="size-4" /> Storage
              </h2>
              {pulse.storage.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-sm">No objects in Storage yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {pulse.storage.map((b) => (
                    <li key={b.bucket} className="flex justify-between text-sm">
                      <span className="font-medium">{b.bucket}</span>
                      <span className="text-muted-foreground">
                        {b.files} files · {formatBytes(Number(b.bytes))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground mt-3 text-xs">
                Mail 24h: {pulse.usage.email_sent_24h} sent · {pulse.usage.email_failed_24h} failed.
                Pending PayHero/STK rows: {pulse.usage.pending_payments}.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pulse" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <Bell className="size-4" /> Event stream
              </h2>
              {pulse.events.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-sm">No recent platform events.</p>
              ) : (
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                  {pulse.events.map((ev, i) => (
                    <li key={`${ev.at}-${i}`} className="rounded-xl border border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{ev.title}</p>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatWhen(ev.at)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {ev.kind}
                        {ev.detail ? ` · ${ev.detail}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <ScrollText className="size-4" /> Dead-letter queue
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/unclaimed">Unclaimed payments ({pulse.usage.unclaimed})</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/communications">Communications</Link>
                </Button>
              </div>
              <h3 className="mt-4 text-xs font-semibold tracking-wide uppercase">Failed email</h3>
              {pulse.dlq.emails.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">Mail queue is clear.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {pulse.dlq.emails.slice(0, 8).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.template_id}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {row.to_email} · {row.error ?? "error"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mailBusy}
                        onClick={() => onRetryMail(row.id)}
                      >
                        Retry
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="mt-4 text-xs font-semibold tracking-wide uppercase">Payments</h3>
              {pulse.dlq.payments.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">No pending or failed payments.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {pulse.dlq.payments.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {p.purpose} · {p.status}
                      </span>
                      <span className="text-muted-foreground shrink-0">{KES(Number(p.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trust" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <Shield className="size-4" /> Audit log
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Impersonation plus subscription overrides, flags, cron retries and purges.
              </p>
              {audit.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-sm">No admin actions recorded yet.</p>
              ) : (
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                  {audit.slice(0, 40).map((row) => (
                    <li key={`${row.kind}-${row.id}`} className="rounded-xl border border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {row.action}
                          {row.label ? ` · ${row.label}` : ""}
                        </p>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatWhen(row.at)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">{row.kind}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="surface-card space-y-4 p-5">
              <div>
                <h2 className="inline-flex items-center gap-2 font-semibold">
                  <Flag className="size-4" /> Data erasure
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Hard-delete a tenant (shops, sales, logos, auth users) from the vendor page. You
                  must type the exact shop name and a reason. The audit row is kept.
                </p>
                <Button size="sm" className="mt-3" variant="outline" asChild>
                  <Link to="/admin/vendors">Open vendors</Link>
                </Button>
              </div>
              <div>
                <h2 className="inline-flex items-center gap-2 font-semibold">
                  <Activity className="size-4" /> Backups
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Point-in-time recovery is on the Supabase project, not inside this app. Dry-run
                  restore from Infrastructure → Backups.
                </p>
                <Button size="sm" className="mt-3" variant="outline" asChild>
                  <a
                    href="https://supabase.com/dashboard/project/hnzzkmifgufurkqvnchp/settings/infrastructure"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open backups
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
