import { useEffect, useRef, useState } from "react";
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
import { emptyProductAttrs, type ProductAttrs } from "@/lib/category";
import { FeatureGate } from "@/components/category/FeatureGate";
import { CategoryProductFields } from "@/modules/catalog/CategoryProductFields";
import { useShopCategory } from "@/hooks/use-shop-category";

export type ProductDraft = {
  name: string;
  sku: string;
  category: string;
  description: string;
  cost: string;
  price: string;
  stock: string;
  reorderLevel: string;
  taxClass: string;
  classificationCode: string;
  attrs: ProductAttrs;
};

const DEPARTMENTS = ["Staples", "Dairy", "Bakery", "Household", "Pharmacy", "Drinks", "Services", "Menu", "Parts", "Inputs"];

export function productToDraft(
  p?: Product,
  defaults?: { taxClass?: string },
): ProductDraft {
  return {
    name: p?.name ?? "",
    sku: p?.sku && p.sku !== "—" ? p.sku : "",
    category: p?.category ?? "Staples",
    description: "",
    cost: p ? String(p.cost) : "",
    price: p ? String(p.price) : "",
    stock: p ? String(p.stock) : "",
    reorderLevel: p ? String(p.reorderLevel) : "",
    taxClass: p?.taxClass ?? defaults?.taxClass ?? "STANDARD_16",
    classificationCode: p?.classificationCode ?? "",
    attrs: { ...emptyProductAttrs(), ...(p?.attrs ?? {}) },
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
  defaultTaxClass,
  requireClassification = false,
}: {
  initial?: Product;
  submitLabel: string;
  onSubmit: (draft: ProductDraft, imageFile?: File | null) => void | Promise<void>;
  formId?: string;
  hideSubmit?: boolean;
  defaultTaxClass?: string;
  requireClassification?: boolean;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() =>
    productToDraft(initial, defaultTaxClass ? { taxClass: defaultTaxClass } : {}),
  );
  const { def } = useShopCategory();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blobPreview = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobPreview.current) URL.revokeObjectURL(blobPreview.current);
    };
  }, []);

  const set = (key: keyof ProductDraft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", { description: "PNG, JPG or WebP up to 5MB." });
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Use a JPEG, PNG or WebP photo");
      return;
    }
    if (blobPreview.current) URL.revokeObjectURL(blobPreview.current);
    const url = URL.createObjectURL(file);
    blobPreview.current = url;
    setImageFile(file);
    setPreview(url);
  };

  return (
    <form
      id={formId}
      className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        if (requireClassification && !draft.classificationCode.trim()) {
          toast.error("Classification code required", {
            description: "Chemist products need a classification code for audit receipts.",
          });
          return;
        }
        setBusy(true);
        void Promise.resolve(onSubmit(draft, imageFile))
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : "Could not save product");
          })
          .finally(() => setBusy(false));
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
              placeholder="Product name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pcat" className="text-muted-foreground text-xs">
                Department
              </Label>
              <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger id="pcat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((c) => (
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
                placeholder="SKU or barcode"
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
              placeholder="Optional notes"
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
            <div className="space-y-1.5">
              <Label htmlFor="ptax" className="text-muted-foreground text-xs">
                Tax class
              </Label>
              <Select value={draft.taxClass} onValueChange={(v) => set("taxClass", v)}>
                <SelectTrigger id="ptax">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD_16">Rate A — 16% VAT</SelectItem>
                  <SelectItem value="ZERO_RATED">Rate B — 0% zero-rated</SelectItem>
                  <SelectItem value="EXEMPT">Rate C — Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pclass" className="text-muted-foreground text-xs">
                Classification code {requireClassification ? "(required for chemists)" : "(optional)"}
              </Label>
              <Input
                id="pclass"
                required={requireClassification}
                placeholder="e.g. KE1NTX00012 for chemists"
                value={draft.classificationCode}
                onChange={(e) => set("classificationCode", e.target.value)}
              />
              <FeatureGate module="tax_rate_bc">
                <p className="text-muted-foreground text-xs">
                  Rate B (zero-rated) and Rate C (exempt) print on the ETR for this chemist.
                </p>
              </FeatureGate>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Notify when stock falls below this number. Sugar-style Friday rush.
          </p>
        </section>

        {def.modules.length > 0 && (
        <section className="surface-card space-y-4 p-6">
          <h2 className="font-display text-base font-bold">{def.label} fields</h2>
          <p className="text-muted-foreground text-xs">
            Extra fields follow this shop&apos;s category. Other shops on the same account keep their own layout.
          </p>
          <CategoryProductFields
            attrs={draft.attrs}
            onChange={(patch) =>
              setDraft((d) => ({ ...d, attrs: { ...d.attrs, ...patch } }))
            }
          />
        </section>
        )}
      </div>

      <section className="surface-card space-y-3 p-6 lg:sticky lg:top-20">
        <h2 className="font-display text-base font-bold">Product Image</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
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
          <p className="text-muted-foreground text-[11px]">PNG, JPG or WebP up to 5MB</p>
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
