import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { LifeBuoy, Loader2, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { SupportTicketDialog } from "@/components/app/SupportTicketDialog";
import { SupportTicketLive } from "@/components/app/SupportTicketLive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fetchSupportMessages,
  listVendorSupportTickets,
  replySupportTicket,
  supportCategoryLabel,
  supportStatusLabel,
  type SupportTicket,
} from "@/lib/support-tickets";
import { isSupabaseConfigured } from "@/lib/supabase";

type SupportSearch = { ticket?: string };

export const Route = createFileRoute("/app/support")({
  head: () => ({
    meta: [
      { title: "Support — InuaBiz" },
      {
        name: "description",
        content: "Report issues and chat with InuaBiz support. M-Pesa and till problems are prioritised.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): SupportSearch => {
    const ticket = typeof search["ticket"] === "string" ? search["ticket"] : undefined;
    return ticket ? { ticket } : {};
  },
  component: VendorSupport,
});

function priorityTone(p: string) {
  if (p === "urgent" || p === "high") return "bg-destructive/15 text-destructive";
  if (p === "medium") return "bg-warning/20 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function VendorSupport() {
  const live = isSupabaseConfigured();
  const navigate = useNavigate({ from: Route.fullPath });
  const { ticket: ticketParam } = Route.useSearch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reply, setReply] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets", "vendor"],
    queryFn: listVendorSupportTickets,
    enabled: live,
  });

  const tickets = ticketsQuery.data ?? [];
  const selectedId = ticketParam ?? tickets[0]?.id ?? null;
  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const messagesQuery = useQuery({
    queryKey: ["support-messages", selectedId],
    queryFn: () => fetchSupportMessages(selectedId!),
    enabled: live && Boolean(selectedId),
  });
  const messages = messagesQuery.data ?? [];

  const replyMutation = useMutation({
    mutationFn: (text: string) => replySupportTicket(selectedId!, text),
    onSuccess: () => {
      setReply("");
      void queryClient.invalidateQueries({ queryKey: ["support-messages", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Message sent");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectTicket = (t: SupportTicket) => {
    void navigate({ search: { ticket: t.id } });
  };

  return (
    <AppShell
      title="Support"
      description="Report till, M-Pesa, or inventory issues — we reply in this thread"
      actions={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> New ticket
        </Button>
      }
    >
      <SupportTicketLive tenantScope="vendor" />
      {selectedId && <SupportTicketLive ticketId={selectedId} />}

      {!live && (
        <p className="text-muted-foreground mb-4 text-sm">
          Connect Supabase to open live support tickets.
        </p>
      )}

      <div className="grid min-h-[480px] gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Your tickets</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {ticketsQuery.isLoading && (
              <p className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </p>
            )}
            {!ticketsQuery.isLoading && tickets.length === 0 && (
              <div className="p-6 text-center">
                <LifeBuoy className="text-muted-foreground mx-auto mb-3 size-8" />
                <p className="text-sm font-medium">No tickets yet</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Tap the lifebuoy or New ticket when something breaks at the till.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                  Report an issue
                </Button>
              </div>
            )}
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTicket(t)}
                className={cn(
                  "mb-1 w-full rounded-xl border p-3 text-left transition-colors",
                  selectedId === t.id
                    ? "border-primary/30 bg-primary-soft/40"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <p className="truncate text-sm font-semibold">{t.subject}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {supportStatusLabel(t.status)}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {format(parseISO(t.updated_at), "d MMM · HH:mm")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card flex flex-col overflow-hidden">
          {!selected ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8 text-sm">
              <MessageSquare className="mb-3 size-10 opacity-40" />
              Select a ticket or open a new one
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.subject}</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {supportCategoryLabel(selected.category)} · opened{" "}
                      {format(parseISO(selected.created_at), "d MMM yyyy HH:mm")}
                    </p>
                  </div>
                  <Badge className={priorityTone(selected.priority)}>{selected.priority}</Badge>
                </div>
                {selected.ai_summary && (
                  <div className="bg-muted/50 mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed">
                    <span className="font-semibold">Summary: </span>
                    {selected.ai_summary}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {messagesQuery.isLoading && (
                  <p className="text-muted-foreground text-sm">Loading messages…</p>
                )}
                {messages.map((m) => {
                  const isVendor = m.sender_type === "vendor";
                  const isAi = m.sender_type === "ai_assistant";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", isVendor ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          isVendor && "bg-primary text-primary-foreground",
                          isAi && "border border-primary/20 bg-primary-soft/30",
                          !isVendor && !isAi && "bg-muted",
                        )}
                      >
                        <p className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                          {isVendor ? "You" : isAi ? "InuaBiz assistant" : "Support team"}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.message}</p>
                        <p className="mt-1 text-[10px] opacity-60">
                          {format(parseISO(m.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected.status !== "closed" && (
                <div className="border-t border-border p-4 sm:p-5">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Add details — amount, receipt code, what you tried…"
                    className="min-h-[80px]"
                  />
                  <Button
                    className="mt-2"
                    disabled={reply.trim().length < 1 || replyMutation.isPending}
                    onClick={() => replyMutation.mutate(reply.trim())}
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Send reply
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <SupportTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => {
          void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
          void navigate({ search: { ticket: id } });
        }}
      />
    </AppShell>
  );
}
