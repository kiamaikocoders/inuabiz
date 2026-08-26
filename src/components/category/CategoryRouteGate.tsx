import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useShopCategory } from "@/hooks/use-shop-category";
import type { FeatureModule } from "@/lib/category";

export function CategoryRouteGate({
  module,
  children,
}: {
  module: FeatureModule;
  children: ReactNode;
}) {
  const { hasModule, def } = useShopCategory();
  if (hasModule(module)) return children;
  return (
    <AppShell title={def.label} description="This screen is for another shop category.">
      <p className="text-muted-foreground max-w-lg text-sm">
        {def.label} does not use this module. Switch the shop category in Settings, or open a shop
        that does.
      </p>
    </AppShell>
  );
}
