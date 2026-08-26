import { createFileRoute } from "@tanstack/react-router";
import { CategoryRouteGate } from "@/components/category/CategoryRouteGate";
import { TicketQueue } from "@/modules/eatery/TicketQueue";

export const Route = createFileRoute("/app/tickets")({
  head: () => ({ meta: [{ title: "Service tickets — InuaBiz" }] }),
  component: () => (
    <CategoryRouteGate module="ticket_print">
      <TicketQueue
        kind="SERVICE"
        title="Tickets"
        description="Duration jobs from the service desk. Advance as you start, finish and close."
      />
    </CategoryRouteGate>
  ),
});
