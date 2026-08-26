import { daysUntilExpiry, type ProductAttrs } from "@/lib/category";
import { Badge } from "@/components/ui/badge";
import { taxClassLabel, type TaxClass } from "@/lib/tax";

export function productTileMeta(attrs: ProductAttrs | undefined, taxClass?: TaxClass) {
  const bits: string[] = [];
  if (attrs?.size) bits.push(attrs.size);
  if (attrs?.color) bits.push(attrs.color);
  if (attrs?.variant_spec) bits.push(attrs.variant_spec);
  if (attrs?.unit) bits.push(attrs.unit);
  if (attrs?.batch_number) bits.push(`Lot ${attrs.batch_number}`);
  if (attrs?.season) bits.push(attrs.season);
  if (attrs?.duration_minutes) bits.push(`${attrs.duration_minutes} min`);
  if (attrs?.warranty_months) bits.push(`${attrs.warranty_months} mo warranty`);
  if (taxClass && taxClass !== "STANDARD_16") bits.push(taxClassLabel(taxClass));
  return bits;
}

export function ExpiryBadge({ iso }: { iso?: string | null }) {
  const days = daysUntilExpiry(iso);
  if (days == null) return null;
  if (days < 0) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Expired
      </Badge>
    );
  }
  if (days <= 30) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        {days}d left
      </Badge>
    );
  }
  if (days <= 90) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Exp {days}d
      </Badge>
    );
  }
  return null;
}
