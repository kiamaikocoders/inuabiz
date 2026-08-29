import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ProductForm, type ProductDraft } from "@/components/app/ProductForm";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProduct, fetchProduct, saveProduct } from "@/lib/data";
import { uploadProductImage } from "@/lib/product-image";
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
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
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

  const onSubmit = async (draft: ProductDraft, imageFile?: File | null) => {
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
    if (imageFile && !res.demo) {
      await uploadProductImage(productId, imageFile);
    }
    toast.success("Product updated", {
      description: res.demo ? "Demo mode — sign in to persist to Supabase." : "Inventory saved.",
    });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["product", productId] });
    await navigate({ to: "/app/inventory" });
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(productId);
      toast.success("Product removed");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await navigate({ to: "/app/inventory" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      title={product?.name ?? "Edit product"}
      description="Name, prices, stock, SKU, expiry and batch"
      actions={
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/40" disabled={!product}>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this product?</AlertDialogTitle>
                <AlertDialogDescription>
                  It leaves the till and inventory list. Past sales stay intact.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={deleting} onClick={() => void onDelete()}>
                  {deleting ? "Removing…" : "Delete product"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
