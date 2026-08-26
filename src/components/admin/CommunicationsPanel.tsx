import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Mail,
  Megaphone,
  Pencil,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { draftBroadcast, improveEmailSubject } from "@/lib/admin-ai";
import { useIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import {
  audienceLabel,
  channelLabel,
  emailInfraStatus,
  getEmailProviderSettings,
  listBroadcasts,
  listCommunicationTemplates,
  listEmailSendLog,
  saveBroadcast,
  saveCommunicationTemplate,
  saveEmailProviderSetting,
  testCommunicationTemplate,
  withPreviewVars,
  type BroadcastAudience,
  type BroadcastChannel,
  type CommunicationTemplate,
  type EmailCategory,
} from "@/lib/communications";

type Tab = "broadcast" | "templates" | "delivery" | "provider";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm");
  } catch {
    return iso;
  }
}

/**
 * WYA-style communications hub: broadcast, Figma email templates, delivery log, provider.
 */
export function CommunicationsPanel() {
  const identity = useIdentity("admin");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("broadcast");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [channel, setChannel] = useState<BroadcastChannel>("banner_email");
  const [drafting, setDrafting] = useState(false);

  const [templateCategory, setTemplateCategory] = useState<"all" | EmailCategory>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<CommunicationTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [improving, setImproving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<CommunicationTemplate | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState(identity.email);
  const [testTemplateId, setTestTemplateId] = useState<string | null>(null);

  const [fromEmail, setFromEmail] = useState("support@mail.inuabiz.co.ke");
  const [fromName, setFromName] = useState("InuaBiz");
  const [testProviderTo, setTestProviderTo] = useState(identity.email);

  const broadcastsQuery = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: listBroadcasts,
  });
  const templatesQuery = useQuery({
    queryKey: ["admin-comm-templates"],
    queryFn: listCommunicationTemplates,
    enabled: tab === "templates" || tab === "broadcast" || tab === "provider",
  });
  const logQuery = useQuery({
    queryKey: ["admin-email-send-log"],
    queryFn: () => listEmailSendLog(100),
    enabled: tab === "delivery" || tab === "provider",
  });
  const providerQuery = useQuery({
    queryKey: ["admin-email-provider"],
    queryFn: getEmailProviderSettings,
    enabled: tab === "provider",
  });

  const items = broadcastsQuery.data ?? [];
  const templates = templatesQuery.data?.templates ?? [];
  const logs = logQuery.data ?? [];
  const fromBundle = templatesQuery.data?.source === "bundle";
  const infra = emailInfraStatus();

  useEffect(() => {
    if (!providerQuery.data) return;
    setFromEmail(providerQuery.data.fromEmail);
    setFromName(providerQuery.data.fromName);
  }, [providerQuery.data]);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === "all") return templates;
    return templates.filter((t) => t.category === templateCategory);
  }, [templates, templateCategory]);

  const kpis = useMemo(() => {
    const sent = items.filter((r) => r.status === "published").length;
    const drafts = items.filter((r) => r.status === "draft").length;
    const recipients = items.reduce((n, r) => n + (r.recipient_count || 0), 0);
    return { sent, drafts, recipients, templates: templates.length };
  }, [items, templates.length]);

  const saveTplMutation = useMutation({
    mutationFn: () =>
      saveCommunicationTemplate({
        id: editTpl?.id ?? "",
        subject: editSubject,
        html: editHtml,
      }),
    onSuccess: () => {
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-comm-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testTplMutation = useMutation({
    mutationFn: () => {
      const tpl = templates.find((t) => t.id === testTemplateId);
      if (!tpl) throw new Error("Pick a template");
      return testCommunicationTemplate({
        templateId: tpl.id,
        to: testTo.trim(),
        subject: tpl.subject,
      });
    },
    onSuccess: () => {
      setTestOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-email-send-log"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const broadcastMutation = useMutation({
    mutationFn: (publish: boolean) =>
      saveBroadcast({
        body: message.trim(),
        audience,
        channel,
        publish,
      }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEditor = (tpl: CommunicationTemplate) => {
    setEditTpl(tpl);
    setEditSubject(tpl.subject);
    setEditHtml(tpl.html);
    setEditOpen(true);
  };

  return (
    <AdminShell
      title="Communications"
      description="Broadcasts · email templates · delivery log"
      actions={
        <Button
          size="sm"
          variant="ink"
          className="hidden rounded-[10px] sm:inline-flex"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
            void queryClient.invalidateQueries({ queryKey: ["admin-comm-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["admin-email-send-log"] });
            void queryClient.invalidateQueries({ queryKey: ["admin-email-provider"] });
          }}
        >
          Refresh
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="templates">Email templates</TabsTrigger>
          <TabsTrigger value="delivery">Delivery log</TabsTrigger>
          <TabsTrigger value="provider">Provider</TabsTrigger>
        </TabsList>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sent" value={String(kpis.sent)} hint="Published broadcasts" icon={Send} />
          <StatCard
            label="Recipients"
            value={String(kpis.recipients)}
            hint="Last fan-out"
            icon={Megaphone}
            tone="gold"
          />
          <StatCard label="Drafts" value={String(kpis.drafts)} hint="Ready to send" icon={Pencil} tone="muted" />
          <StatCard
            label="Templates"
            value={String(kpis.templates || 17)}
            hint={fromBundle ? "Local Figma catalog" : "Saved in Supabase"}
            icon={Mail}
            tone="teal"
          />
        </div>

        <TabsContent value="broadcast" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="surface-card p-5">
              <h2 className="inline-flex items-center gap-2 font-semibold">
                <Megaphone className="text-primary size-4" /> New broadcast
              </h2>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aud">Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v as BroadcastAudience)}>
                    <SelectTrigger id="aud">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All vendors</SelectItem>
                      <SelectItem value="active">Active subscribers</SelectItem>
                      <SelectItem value="trial">Trial vendors</SelectItem>
                      <SelectItem value="lapsed">Lapsed / suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch">Channels</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as BroadcastChannel)}>
                    <SelectTrigger id="ch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">In-app banner only</SelectItem>
                      <SelectItem value="banner_email">Banner + email</SelectItem>
                      <SelectItem value="all">Banner + email + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Message</Label>
                  <Textarea
                    id="msg"
                    rows={4}
                    placeholder="Scheduled maintenance on Sunday 02:00 – 03:00 EAT."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={drafting}
                    onClick={() => {
                      setDrafting(true);
                      void draftBroadcast(
                        audience,
                        message || "Remind vendors about trial ending and KES 3,000 STK renewal",
                      )
                        .then((text) => {
                          setMessage(text);
                          toast.success("Draft ready", { description: "Edit before sending." });
                        })
                        .catch((err: unknown) =>
                          toast.error("Draft failed", {
                            description: err instanceof Error ? err.message : "Try again",
                          }),
                        )
                        .finally(() => setDrafting(false));
                    }}
                  >
                    <Sparkles className="mr-2 size-4" />
                    {drafting ? "Drafting…" : "Draft with AI"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!message.trim() || broadcastMutation.isPending}
                    onClick={() => broadcastMutation.mutate(false)}
                  >
                    Save draft
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!message.trim() || broadcastMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Broadcast now to the selected audience?")) {
                        broadcastMutation.mutate(true);
                      }
                    }}
                  >
                    <Send className="mr-2 size-4" /> Send
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="surface-card p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Live preview
                </p>
                <div className="border-gold/40 bg-gold/15 mt-3 rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    {message || "Scheduled maintenance on Sunday 02:00 – 03:00 EAT."}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {channelLabel(channel)} · {audienceLabel(audience)}
                  </p>
                </div>
              </div>

              <div className="surface-card p-5">
                <h2 className="font-semibold">History</h2>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Message</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="max-w-xs truncate font-medium">{b.body}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {audienceLabel(b.audience)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {channelLabel(b.channel)}
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              status={
                                b.status === "published"
                                  ? "Sent"
                                  : b.status === "scheduled"
                                    ? "Scheduled"
                                    : "Draft"
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 space-y-4">
          <div className="surface-card p-5">
            <h2 className="font-semibold">Email templates</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              The 17 InuaBiz Figma mails. Edit HTML, preview in-browser, or queue a test send.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "auth", "transactional", "ops"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTemplateCategory(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                    templateCategory === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {fromBundle ? (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Using local catalog</AlertTitle>
                <AlertDescription>
                  Could not read saved rows from <code>communication_templates</code>. Preview
                  still uses the 17 Figma templates with the lifted-duka mark.
                </AlertDescription>
              </Alert>
            ) : null}

            {templatesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((tpl) => (
                      <TableRow key={tpl.id}>
                        <TableCell>
                          <div className="font-medium">{tpl.name}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">{tpl.id}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {tpl.category}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {tpl.subject}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-nowrap justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openEditor(tpl)}>
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPreviewTpl(tpl);
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setTestTemplateId(tpl.id);
                                setTestTo(identity.email);
                                setTestOpen(true);
                              }}
                            >
                              <Mail className="mr-1 h-3 w-3" />
                              Test
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="mt-0">
          <div className="surface-card p-5">
            <h2 className="font-semibold">Delivery log</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Tests, receipts and broadcasts from <code>email_send_log</code>.
            </p>
            {logQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground">
                          {formatWhen(row.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.template_id}</TableCell>
                        <TableCell>{row.to_email}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {row.subject}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={
                              row.status === "sent"
                                ? "Sent"
                                : row.status === "error"
                                  ? "Error"
                                  : "Scheduled"
                            }
                          />
                          {row.error ? (
                            <div className="text-destructive mt-1 max-w-[220px] truncate text-[10px]">
                              {row.error}
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="provider" className="mt-0">
          <div className="surface-card max-w-3xl space-y-5 p-6">
            <h2 className="font-semibold">Email configuration</h2>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={infra.supabase ? "Connected" : "Not configured"} />
              <span className="text-muted-foreground text-xs self-center">
                Supabase {infra.supabase ? "wired" : "missing"} · Resend{" "}
                {infra.resend
                  ? "Resend SMTP · support@mail.inuabiz.co.ke"
                  : "Supabase not wired"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Email notifications enabled</p>
                <p className="text-muted-foreground text-xs">
                  Transactional + broadcast mail (receipts, stock, trial)
                </p>
              </div>
              <Switch
                checked={providerQuery.data?.notificationsEnabled ?? true}
                onCheckedChange={(v) => {
                  void saveEmailProviderSetting("notificationsEnabled", v).then(() =>
                    queryClient.invalidateQueries({ queryKey: ["admin-email-provider"] }),
                  );
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-name">From name</Label>
                <Input
                  id="from-name"
                  value={providerQuery.data ? fromName : fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  onFocus={() => {
                    if (providerQuery.data) setFromName(providerQuery.data.fromName);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void saveEmailProviderSetting(
                      "fromName",
                      fromName.trim() || "InuaBiz",
                    ).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["admin-email-provider"] }),
                    )
                  }
                >
                  Save name
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">From email</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  onFocus={() => {
                    if (providerQuery.data) setFromEmail(providerQuery.data.fromEmail);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void saveEmailProviderSetting("fromEmail", fromEmail.trim()).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["admin-email-provider"] }),
                    )
                  }
                >
                  Save address
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-to">Test delivery</Label>
              <div className="flex gap-2">
                <Input
                  id="test-to"
                  type="email"
                  value={testProviderTo}
                  onChange={(e) => setTestProviderTo(e.target.value)}
                  placeholder="komuzack@gmail.com"
                />
                <Button
                  onClick={() => {
                    const welcome = templates.find((t) => t.id === "welcome-trial");
                    void testCommunicationTemplate({
                      templateId: welcome?.id ?? "welcome-trial",
                      to: testProviderTo.trim(),
                      subject: welcome?.subject ?? "InuaBiz test",
                    }).then(() =>
                      queryClient.invalidateQueries({ queryKey: ["admin-email-send-log"] }),
                    );
                  }}
                >
                  Send test
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Sends the Welcome template from support@mail.inuabiz.co.ke via dispatch-outbound.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit template — {editTpl?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label>Subject</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={improving || !editSubject.trim()}
                  onClick={() => {
                    setImproving(true);
                    void improveEmailSubject(editTpl?.name || "Email", editSubject)
                      .then(setEditSubject)
                      .finally(() => setImproving(false));
                  }}
                >
                  <Sparkles className="mr-1 size-3" />
                  {improving ? "Improving…" : "Improve subject"}
                </Button>
              </div>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div>
              <Label>HTML</Label>
              <Textarea
                className="mt-1 min-h-[280px] font-mono text-xs"
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
              />
            </div>
            {editTpl?.description ? (
              <p className="text-muted-foreground text-xs">{editTpl.description}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveTplMutation.isPending} onClick={() => saveTplMutation.mutate()}>
              {saveTplMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewTpl?.name}</DialogTitle>
          </DialogHeader>
          <iframe
            title="template-preview"
            className="h-[520px] w-full rounded-lg border border-border bg-white"
            srcDoc={previewTpl ? withPreviewVars(previewTpl.html) : ""}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Send test
              {testTemplateId
                ? ` — ${templates.find((t) => t.id === testTemplateId)?.name}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="test-tpl-to">Recipient email</Label>
            <Input
              id="test-tpl-to"
              type="email"
              className="mt-1"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={testTplMutation.isPending || !testTo.includes("@")}
              onClick={() => testTplMutation.mutate()}
            >
              {testTplMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send test"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
