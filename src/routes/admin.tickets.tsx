import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { LifeBuoy, Loader2, Sparkles, StickyNote, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { SupportTicketLive } from "@/components/app/SupportTicketLive";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  improveSupportReply,
  summarizeSupportThread,
} from "@/lib/admin-ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addInternalNote,
  countOpenSupportTickets,
  fetchInternalNotes,
  fetchSupportMessages,
  listAdminSupportTickets,
  replySupportTicket,
  runSupportDiagnostic,
  supportCategoryLabel,
  supportStatusLabel,
  updateSupportTicketStatus,
  type SupportStatus,
  type SupportTicket,
  type SupportDiagnosticAction,
} from "@/lib/support-tickets";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({
    meta: [
      { title: "Support desk — InuaBiz super admin" },
      {
        name: "description",
        content: "Real-time merchant support tickets with AI triage and internal notes.",
      },
    ],
  }),
  component: AdminTickets,
});

const STATUS_FILTERS: Array<{ id: SupportStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "ai_handling", label: "AI handling" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

function priorityTone(p: string) {
  if (p === "urgent" || p === "high") return "bg-destructive/15 text-destructive";
  if (p === "medium") return "bg-warning/20 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function AdminTickets() {
  const live = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [threadSummary, setThreadSummary] = useState<string[] | null>(null);

  const openCountQuery = useQuery({
    queryKey: ["support-tickets-open-count"],
    queryFn: countOpenSupportTickets,
    enabled: live,
  });

  const listQuery = useQuery({
    queryKey: ["support-tickets", "admin", filter],
    queryFn: () => listAdminSupportTickets(filter === "all" ? undefined : filter),
    enabled: live,
  });

  const tickets = listQuery.data ?? [];
  const selectedLive = useMemo(
    () => (selected ? (tickets.find((t) => t.id === selected.id) ?? selected) : null),
    [tickets, selected],
  );

  const messagesQuery = useQuery({
    queryKey: ["support-messages", selectedLive?.id],
    queryFn: () => fetchSupportMessages(selectedLive!.id),
    enabled: live && Boolean(selectedLive?.id),
  });

  const notesQuery = useQuery({
    queryKey: ["support-internal-notes", selectedLive?.id],
    queryFn: () => fetchInternalNotes(selectedLive!.id),
    enabled: live && Boolean(selectedLive?.id),
  });

  const replyMutation = useMutation({
    mutationFn: (text: string) => replySupportTicket(selectedLive!.id, text),
    onSuccess: () => {
      setReply("");
      void queryClient.invalidateQueries({ queryKey: ["support-messages", selectedLive?.id] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Reply sent to vendor");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportStatus }) =>
      updateSupportTicketStatus(id, status),
    onSuccess: (_d, vars) => {
      toast.success(`Marked ${supportStatusLabel(vars.status)}`);
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets-open-count"] });
      setSelected((prev) => (prev && prev.id === vars.id ? { ...prev, status: vars.status } : prev));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => addInternalNote(selectedLive!.id, note),
    onSuccess: () => {
      setInternalNote("");
      void queryClient.invalidateQueries({ queryKey: ["support-internal-notes", selectedLive?.id] });
      toast.success("Internal note saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLive) throw new Error("No ticket selected");
      const msgs = messagesQuery.data ?? [];
      return summarizeSupportThread({
        ticketId: selectedLive.id,
        subject: selectedLive.subject,
        category: selectedLive.category,
        priority: selectedLive.priority,
        tenantName: selectedLive.tenant_name ?? "—",
        aiSummary: selectedLive.ai_summary,
        messages: msgs.map((m) => ({
          sender:
            m.sender_type === "vendor"
              ? "Vendor"
              : m.sender_type === "ai_assistant"
                ? "AI"
                : "Admin",
          text: m.message,
          at: m.created_at,
        })),
      });
    },
    onSuccess: (result) => {
      setThreadSummary(result.bullets);
      toast.success(
        result.source === "gateway" ? "Thread summarized" : "Summary (offline heuristic)",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const improveToneMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLive) throw new Error("No ticket selected");
      return improveSupportReply({
        ticketId: selectedLive.id,
        subject: selectedLive.subject,
        tenantName: selectedLive.tenant_name ?? "Vendor",
        draft: reply,
      });
    },
    onSuccess: (result) => {
      setReply(result.message);
      toast.success(
        result.source === "gateway" ? "Tone improved" : "Draft kept (AI unavailable)",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const diagnosticMutation = useMutation({
    mutationFn: ({ action }: { action: SupportDiagnosticAction }) =>
      runSupportDiagnostic(selectedLive!.id, action),
    onSuccess: (result) => {
      toast.success(result.summary);
      void queryClient.invalidateQueries({ queryKey: ["support-internal-notes", selectedLive?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCount = openCountQuery.data ?? 0;
  const messages = messagesQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  return (
    <AdminShell
      title="Support desk"
      description="Merchant tickets with AI triage, live chat, and internal notes"
    >
      <SupportTicketLive tenantScope="admin" />
      {selectedLive?.id && <SupportTicketLive ticketId={selectedLive.id} />}

      {!live && (
        <p className="text-muted-foreground mb-4 text-sm">Connect Supabase to load live tickets.</p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open queue"
          value={String(openCount)}
          hint="Open, in progress, or AI handling"
          icon={LifeBuoy}
        />
        <StatCard
          label="In filter"
          value={String(tickets.length)}
          hint={filter === "all" ? "Active tickets" : supportStatusLabel(filter)}
          icon={StickyNote}
          tone="gold"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid min-h-[520px] gap-4 xl:grid-cols-[minmax(260px,340px)_1fr_minmax(220px,280px)]">
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Tickets</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {listQuery.isLoading && (
              <p className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </p>
            )}
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelected(t);
                  setThreadSummary(null);
                }}
                className={cn(
                  "mb-1 w-full rounded-xl border p-3 text-left transition-colors",
                  selectedLive?.id === t.id
                    ? "border-primary/30 bg-primary-soft/40"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <p className="truncate text-sm font-semibold">{t.subject}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{t.tenant_name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={priorityTone(t.priority)} variant="outline">
                    {t.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {supportStatusLabel(t.status)}
                  </Badge>
                </div>
              </button>
            ))}
            {!listQuery.isLoading && tickets.length === 0 && (
              <p className="text-muted-foreground p-6 text-center text-sm">No tickets in this filter.</p>
            )}
          </div>
        </div>

        <div className="surface-card flex flex-col overflow-hidden">
          {!selectedLive ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
              Select a ticket from the queue
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-4">
                <h2 className="text-base font-semibold">{selectedLive.subject}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {selectedLive.tenant_name} · {supportCategoryLabel(selectedLive.category)} ·{" "}
                  {format(parseISO(selectedLive.created_at), "d MMM yyyy HH:mm")}
                </p>
                {selectedLive.ai_summary && (
                  <div className="bg-primary-soft/30 mt-3 rounded-lg border border-primary/15 px-3 py-2 text-xs leading-relaxed">
                    <span className="font-semibold text-primary">AI summary · </span>
                    {selectedLive.ai_summary}
                  </div>
                )}
                {threadSummary && threadSummary.length > 0 && (
                  <div className="bg-muted/50 mt-3 rounded-lg border border-border px-3 py-2 text-xs">
                    <p className="font-semibold">Thread summary</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 leading-relaxed">
                      {threadSummary.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={summarizeMutation.isPending || messages.length === 0}
                    onClick={() => summarizeMutation.mutate()}
                  >
                    {summarizeMutation.isPending ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-3.5" />
                    )}
                    Summarize thread
                  </Button>
                  {(selectedLive.category === "payment" ||
                    selectedLive.category === "billing") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={diagnosticMutation.isPending}
                        onClick={() =>
                          diagnosticMutation.mutate({ action: "verify_mpesa_setup" })
                        }
                      >
                        {diagnosticMutation.isPending ? (
                          <Loader2 className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <Wrench className="mr-2 size-3.5" />
                        )}
                        Verify M-Pesa setup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={diagnosticMutation.isPending}
                        onClick={() =>
                          diagnosticMutation.mutate({ action: "poll_pending_payments" })
                        }
                      >
                        Re-sync pending STK
                      </Button>
                    </>
                  )}
                  {selectedLive.category === "payment" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={diagnosticMutation.isPending}
                      onClick={() =>
                        diagnosticMutation.mutate({ action: "register_c2b_webhooks" })
                      }
                    >
                      Re-register C2B webhooks
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: selectedLive.id, status: "in_progress" })
                    }
                  >
                    Take ticket
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({ id: selectedLive.id, status: "resolved" })
                    }
                  >
                    Mark resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      statusMutation.mutate({ id: selectedLive.id, status: "closed" })
                    }
                  >
                    Close
                  </Button>
                  <Select
                    value={selectedLive.status}
                    onValueChange={(v) =>
                      statusMutation.mutate({ id: selectedLive.id, status: v as SupportStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ["open", "in_progress", "ai_handling", "resolved", "closed"] as SupportStatus[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {supportStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const isAdmin = m.sender_type === "admin";
                  const isAi = m.sender_type === "ai_assistant";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          isAdmin && "bg-primary text-primary-foreground",
                          isAi && "border border-violet-300/40 bg-violet-50 dark:bg-violet-950/30",
                          m.sender_type === "vendor" && "bg-muted",
                        )}
                      >
                        <p className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                          {isAdmin
                            ? "You"
                            : isAi
                              ? "AI assistant"
                              : "Vendor"}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.message}</p>
                        <p className="mt-1 text-[10px] opacity-60">
                          {format(parseISO(m.created_at), "d MMM HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-4">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to the merchant…"
                  className="min-h-[72px]"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      reply.trim().length < 3 || improveToneMutation.isPending
                    }
                    onClick={() => improveToneMutation.mutate()}
                  >
                    {improveToneMutation.isPending ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-3.5" />
                    )}
                    Improve tone
                  </Button>
                  <Button
                    disabled={reply.trim().length < 1 || replyMutation.isPending}
                    onClick={() => replyMutation.mutate(reply.trim())}
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Send to vendor
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="surface-card flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Internal notes</p>
            <p className="text-muted-foreground text-xs">Invisible to vendors — AI triage lands here too</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <p className="leading-relaxed whitespace-pre-wrap">{n.note}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {format(parseISO(n.created_at), "d MMM HH:mm")}
                </p>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-muted-foreground p-4 text-center text-xs">No internal notes yet.</p>
            )}
          </div>
          {selectedLive && (
            <div className="border-t border-border p-3">
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Triage note for the team…"
                className="min-h-[64px] text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                disabled={internalNote.trim().length < 2 || noteMutation.isPending}
                onClick={() => noteMutation.mutate(internalNote.trim())}
              >
                Add note
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
