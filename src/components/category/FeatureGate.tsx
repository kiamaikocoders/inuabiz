import type { ReactNode } from "react";
import { useShopCategory } from "@/hooks/use-shop-category";
import type { FeatureModule } from "@/lib/category";

/**
 * Mount children only when the active shop category enables this module.
 */
export function FeatureGate({
  module,
  children,
  fallback = null,
}: {
  module: FeatureModule;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasModule } = useShopCategory();
  if (!hasModule(module)) return fallback;
  return <>{children}</>;
}
