import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Invalidates support ticket queries when messages or ticket status change.
 */
export function SupportTicketLive({
  ticketId,
  tenantScope,
}: {
  /** When set, only refresh messages for this ticket. */
  ticketId?: string;
  /** Admin desk listens to all tickets; vendor listens to own tenant. */
  tenantScope?: "admin" | "vendor";
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    const bind = async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (cancelled || !user) return;

      const channelName = ticketId
        ? `support-messages-${ticketId}`
        : tenantScope === "admin"
          ? "support-tickets-admin"
          : "support-tickets-vendor";

      channel = sb.channel(channelName);

      if (ticketId) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_ticket_messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          () => {
            void queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
            void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
          },
        );
      } else {
        channel = channel
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "support_tickets" },
            () => {
              void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
              void queryClient.invalidateQueries({ queryKey: ["support-tickets-open-count"] });
            },
          )
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "support_ticket_messages" },
            () => {
              void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            },
          );
      }

      await channel.subscribe();
    };

    void bind();
    return () => {
      cancelled = true;
      if (channel) void sb.removeChannel(channel);
    };
  }, [queryClient, ticketId, tenantScope]);

  return null;
}
