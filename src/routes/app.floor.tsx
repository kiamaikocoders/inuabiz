import { createFileRoute } from "@tanstack/react-router";
import { CategoryRouteGate } from "@/components/category/CategoryRouteGate";
import { FloorPage } from "@/modules/eatery/FloorBoard";

export const Route = createFileRoute("/app/floor")({
  head: () => ({ meta: [{ title: "Floor — InuaBiz" }] }),
  component: () => (
    <CategoryRouteGate module="table_management">
      <FloorPage />
    </CategoryRouteGate>
  ),
});
