import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { StatusEmpty } from "@/components/status/StatusPage";
import { Ticket } from "lucide-react";
import {
  fetchShopTickets,
  setShopTicketStatus,
  type ShopTicket,
} from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KITCHEN_FLOW: ShopTicket["status"][] = ["NEW", "PREP", "READY", "SERVED"];
const SERVICE_FLOW: ShopTicket["status"][] = ["NEW", "PREP", "READY", "DONE"];

function nextStatus(ticket: ShopTicket): ShopTicket["status"] {
  const flow = ticket.kind === "SERVICE" ? SERVICE_FLOW : KITCHEN_FLOW;
  return flow[Math.min(flow.indexOf(ticket.status) + 1, flow.length - 1)]!;
}

export function TicketQueue({
  kind,
  title,
  description,
}: {
  kind: "KITCHEN" | "SERVICE";
  title: string;
  description: string;
}) {
  const live = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const { data: tickets = [] } = useQuery({
    queryKey: ["shop-tickets", kind],
    queryFn: () => fetchShopTickets(kind),
    enabled: live,
  });
  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ShopTicket["status"] }) =>
      setShopTicketStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shop-tickets"] });
    },
    onError: (err: unknown) =>
      toast.error("Could not update ticket", {
        description: err instanceof Error ? err.message : "Try again",
      }),
  });

  const open = tickets.filter((t) => t.status !== "SERVED" && t.status !== "DONE");
  const done = tickets.filter((t) => t.status === "SERVED" || t.status === "DONE");

  return (
    <AppShell title={title} description={description}>
      {!live && (
        <StatusEmpty
          icon={Ticket}
          title="Sign in to run tickets"
          description="Kitchen and service tickets persist on the shop after checkout."
          primary={{ label: "Open till", to: "/app/pos" }}
        />
      )}
      {live && tickets.length === 0 && (
        <StatusEmpty
          icon={Ticket}
          title="No tickets yet"
          description="Close a sale on the till to send a ticket here."
          primary={{ label: "Open till", to: "/app/pos" }}
        />
      )}
      {live && tickets.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <QueueColumn
            heading="Open"
            tickets={open}
            onAdvance={(t) => mutate.mutate({ id: t.id, status: nextStatus(t) })}
          />
          <QueueColumn heading="Done" tickets={done} />
        </div>
      )}
    </AppShell>
  );
}

function QueueColumn({
  heading,
  tickets,
  onAdvance,
}: {
  heading: string;
  tickets: ShopTicket[];
  onAdvance?: (t: ShopTicket) => void;
}) {
  return (
    <section className="surface-card p-4">
      <h2 className="font-semibold">
        {heading} · {tickets.length}
      </h2>
      <ul className="mt-3 space-y-2">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-muted-foreground text-xs">
                  {t.table_label ?? "Walk-in"}
                  {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  t.status === "NEW" && "bg-warning/20",
                  t.status === "PREP" && "bg-primary/15",
                  t.status === "READY" && "bg-success/15",
                  (t.status === "SERVED" || t.status === "DONE") && "bg-muted",
                )}
              >
                {t.status}
              </span>
            </div>
            <ul className="text-muted-foreground mt-2 list-disc pl-4 text-xs">
              {t.items.map((item, i) => (
                <li key={`${item.name}-${i}`}>
                  {item.qty} × {item.name}
                </li>
              ))}
            </ul>
            {onAdvance && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => onAdvance(t)}
              >
                Advance
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
