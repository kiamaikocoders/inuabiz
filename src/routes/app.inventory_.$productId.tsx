import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ProductForm, type ProductDraft } from "@/components/app/ProductForm";
import { Button } from "@/components/ui/button";
import { fetchProduct, saveProduct } from "@/lib/data";
import { fetchShops } from "@/lib/ops";
import { fetchProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { categoryHasModule } from "@/lib/category";

export const Route = createFileRoute("/app/inventory_/$productId")({
  head: () => ({
    meta: [{ title: "Edit product — InuaBiz" }],
  }),
  component: EditProduct,
});

function EditProduct() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
  });
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
  const chemist = categoryHasModule(shop?.category, "tax_rate_bc");

  const onSubmit = async (draft: ProductDraft) => {
    const res = await saveProduct({
      id: productId,
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
    toast.success("Product updated", {
      description: res.demo ? "Demo mode — sign in to persist to Supabase." : "Inventory saved.",
    });
    await navigate({ to: "/app/inventory" });
  };

  return (
    <AppShell
      title={product?.name ?? "Edit product"}
      description="Name, prices, stock and reorder level"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/inventory">Cancel</Link>
          </Button>
          <Button type="submit" form="product-form" disabled={!product}>
            Save Product
          </Button>
        </div>
      }
    >
      <Button variant="ghost" size="sm" className="text-primary mb-4 -ml-2" asChild>
        <Link to="/app/inventory">← Back to Inventory</Link>
      </Button>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && !product && (
        <p className="text-muted-foreground text-sm">Product not found.</p>
      )}
      {product && (
        <ProductForm
          key={product.id}
          formId="product-form"
          hideSubmit
          initial={product}
          submitLabel="Save changes"
          requireClassification={chemist}
          onSubmit={onSubmit}
        />
      )}
    </AppShell>
  );
}
