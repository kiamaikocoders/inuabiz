import { createFileRoute } from "@tanstack/react-router";
import { CategoryRouteGate } from "@/components/category/CategoryRouteGate";
import { TicketQueue } from "@/modules/eatery/TicketQueue";

export const Route = createFileRoute("/app/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen — InuaBiz" }] }),
  component: () => (
    <CategoryRouteGate module="order_queue">
      <TicketQueue
        kind="KITCHEN"
        title="Kitchen"
        description="Advance tickets as the pass moves: New → Prep → Ready → Served"
      />
    </CategoryRouteGate>
  ),
});
