import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/auth";
import {
  categoryDef,
  categoryHasModule,
  parseCategory,
  readDemoCategory,
  type BusinessCategory,
  type CategoryDef,
  type FeatureModule,
} from "@/lib/category";
import { fetchShops } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

export function useShopCategory(): {
  category: BusinessCategory;
  def: CategoryDef;
  hasModule: (module: FeatureModule) => boolean;
  shopId: string | null;
} {
  const live = isSupabaseConfigured();
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: live,
  });
  const { data: profile } = useQuery({
    queryKey: ["identity"],
    queryFn: fetchProfile,
    enabled: live,
  });
  const shop = shops.find((s) => s.id === profile?.active_shop_id) ?? shops[0];
  const category = shop ? parseCategory(shop.category) : readDemoCategory();
  const def = categoryDef(category);
  return {
    category,
    def,
    hasModule: (module: FeatureModule) => categoryHasModule(category, module),
    shopId: shop?.id ?? null,
  };
}
