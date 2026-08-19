import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ProductForm, type ProductDraft } from "@/components/app/ProductForm";
import { Button } from "@/components/ui/button";
import { saveProduct } from "@/lib/data";

export const Route = createFileRoute("/app/inventory_/new")({
  head: () => ({
    meta: [{ title: "Add product — InuaBiz" }],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();

  const onSubmit = async (draft: ProductDraft) => {
    const res = await saveProduct({
      name: draft.name,
      sku: draft.sku,
      cost: Number(draft.cost),
      price: Number(draft.price),
      stock: Number(draft.stock),
      reorderLevel: Number(draft.reorderLevel),
    });
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
        formId="product-form"
        hideSubmit
        submitLabel="Save Product"
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
