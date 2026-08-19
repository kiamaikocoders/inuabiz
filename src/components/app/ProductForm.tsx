import { useRef, useState } from "react";
import { ImagePlus, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/lib/mock-data";

export type ProductDraft = {
  name: string;
  sku: string;
  category: string;
  description: string;
  cost: string;
  price: string;
  stock: string;
  reorderLevel: string;
};

const CATEGORIES = ["Staples", "Dairy", "Bakery", "Household", "Pharmacy", "Drinks", "Services"];

export function productToDraft(p?: Product): ProductDraft {
  return {
    name: p?.name ?? "Unga Pembe 2kg",
    sku: p?.sku ?? "UNG-2K",
    category: p?.category ?? "Staples",
    description: p ? "" : "Maize flour — 2kg bag. Fast mover on Saturday.",
    cost: p ? String(p.cost) : "155",
    price: p ? String(p.price) : "195",
    stock: p ? String(p.stock) : "42",
    reorderLevel: p ? String(p.reorderLevel) : "12",
  };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Two-column add/edit product form matching the addons Figma (A3).
 */
export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
  formId = "product-form",
  hideSubmit = false,
}: {
  initial?: Product;
  submitLabel: string;
  onSubmit: (draft: ProductDraft) => void | Promise<void>;
  formId?: string;
  hideSubmit?: boolean;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => productToDraft(initial));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof ProductDraft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", { description: "PNG or JPG up to 5MB." });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  return (
    <form
      id={formId}
      className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void Promise.resolve(onSubmit(draft)).finally(() => setBusy(false));
      }}
    >
      <div className="grid gap-4">
        <section className="surface-card space-y-4 p-6">
          <h2 className="font-display text-base font-bold">Basic Information</h2>
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() =>
              toast.info("Camera scanner", {
                description: "Barcode scanning will use the device camera once wired.",
              })
            }
          >
            <ScanBarcode className="mr-2 size-4" /> Scan barcode with camera
          </Button>
          <div className="space-y-1.5">
            <Label htmlFor="pn" className="text-muted-foreground text-xs">
              Product Name
            </Label>
            <Input
              id="pn"
              required
              placeholder="Unga Pembe 2kg"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pcat" className="text-muted-foreground text-xs">
                Category
              </Label>
              <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger id="pcat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku" className="text-muted-foreground text-xs">
                SKU / Barcode
              </Label>
              <Input
                id="sku"
                placeholder="UNG-2K"
                value={draft.sku}
                onChange={(e) => set("sku", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdesc" className="text-muted-foreground text-xs">
              Description (Optional)
            </Label>
            <Textarea
              id="pdesc"
              rows={3}
              placeholder="Maize flour — 2kg bag. Fast mover on Saturday."
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </section>

        <section className="surface-card space-y-4 p-6">
          <h2 className="font-display text-base font-bold">Pricing &amp; Inventory</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pc" className="text-muted-foreground text-xs">
                Unit Cost (KES)
              </Label>
              <Input
                id="pc"
                type="number"
                required
                placeholder="155"
                value={draft.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp" className="text-muted-foreground text-xs">
                Selling Price (KES) *
              </Label>
              <Input
                id="pp"
                type="number"
                required
                placeholder="195"
                value={draft.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ps" className="text-muted-foreground text-xs">
                Initial Stock Quantity *
              </Label>
              <Input
                id="ps"
                type="number"
                required
                placeholder="42"
                value={draft.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr" className="text-muted-foreground text-xs">
                Reorder level
              </Label>
              <Input
                id="pr"
                type="number"
                required
                placeholder="12"
                value={draft.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Notify when stock falls below this number. Sugar-style Friday rush.
          </p>
        </section>
      </div>

      <section className="surface-card space-y-3 p-6 lg:sticky lg:top-20">
        <h2 className="font-display text-base font-bold">Product Image</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => onImage(e.target.files?.[0])}
        />
        <button
          type="button"
          className="border-border hover:border-primary flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onImage(e.dataTransfer.files[0]);
          }}
        >
          {preview ? (
            <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" />
          ) : (
            <ImagePlus className="text-primary size-8" />
          )}
          <p className="text-primary text-[13px] font-medium">Click or drag image here</p>
          <p className="text-muted-foreground text-[11px]">PNG, JPG up to 5MB</p>
        </button>
      </section>

      {!hideSubmit && (
        <div className="lg:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
