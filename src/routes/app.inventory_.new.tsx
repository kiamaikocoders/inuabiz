import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ProductForm, type ProductDraft } from "@/components/app/ProductForm";
import { Button } from "@/components/ui/button";
import { saveProduct } from "@/lib/data";
import { uploadProductImage } from "@/lib/product-image";
import { fetchShops } from "@/lib/ops";
import { fetchProfile } from "@/lib/auth";
import { defaultTaxClassForCategory } from "@/lib/tax";
import { categoryHasModule } from "@/lib/category";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/app/inventory_/new")({
  head: () => ({
    meta: [{ title: "Add product — InuaBiz" }],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: isSupabaseConfigured(),
  });
  const { data: profile } = useQuery({
    queryKey: ["identity"],
    queryFn: fetchProfile,
  });
  const shop = shops.find((s) => s.id === profile?.active_shop_id) ?? shops[0];
  const defaultTaxClass = defaultTaxClassForCategory(shop?.category);
  const chemist = categoryHasModule(shop?.category, "tax_rate_bc");

  const onSubmit = async (draft: ProductDraft, imageFile?: File | null) => {
    const res = await saveProduct({
      name: draft.name,
      sku: draft.sku,
      cost: Number(draft.cost),
      price: Number(draft.price),
      stock: Number(draft.stock),
      reorderLevel: Number(draft.reorderLevel),
      taxClass: draft.taxClass,
      classificationCode: draft.classificationCode,
      attrs: { ...draft.attrs, department: draft.category },
    });
    if (imageFile && !res.demo) {
      await uploadProductImage(res.id, imageFile);
    }
    toast.success("Product saved", {
      description: res.demo ? "Demo mode — sign in to persist to Supabase." : "Added to inventory.",
    });
    await navigate({ to: "/app/inventory" });
  };

  return (
    <AppShell
      title="Add New Product"
      description="Name, prices, opening stock and reorder level"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/inventory">Cancel</Link>
          </Button>
          <Button type="submit" form="product-form">
            Save Product
          </Button>
        </div>
      }
    >
      <Button variant="ghost" size="sm" className="text-primary mb-4 -ml-2" asChild>
        <Link to="/app/inventory">← Back to Inventory</Link>
      </Button>
      <ProductForm
        key={`${shop?.id ?? "demo"}-${defaultTaxClass}`}
        formId="product-form"
        hideSubmit
        submitLabel="Save Product"
        defaultTaxClass={defaultTaxClass}
        requireClassification={chemist}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
