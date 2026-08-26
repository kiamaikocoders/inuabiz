import { FeatureGate } from "@/components/category/FeatureGate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProductAttrs } from "@/lib/category";

export function CategoryProductFields({
  attrs,
  onChange,
}: {
  attrs: ProductAttrs;
  onChange: (patch: Partial<ProductAttrs>) => void;
}) {
  return (
    <div className="space-y-4">
      <FeatureGate module="serial_tracking">
        <Field
          id="serial"
          label="Serial number"
          placeholder="SN-…"
          value={attrs.serial_number ?? ""}
          onChange={(v) => onChange({ serial_number: v })}
        />
      </FeatureGate>
      <FeatureGate module="imei_tracking">
        <Field
          id="imei"
          label="IMEI"
          placeholder="15-digit IMEI"
          value={attrs.imei ?? ""}
          onChange={(v) => onChange({ imei: v })}
        />
      </FeatureGate>
      <FeatureGate module="warranty">
        <Field
          id="warranty"
          label="Warranty (months)"
          type="number"
          placeholder="12"
          value={attrs.warranty_months ?? ""}
          onChange={(v) => onChange({ warranty_months: v })}
        />
      </FeatureGate>
      <FeatureGate module="variant_specs">
        <Field
          id="variant"
          label="Variant / spec model"
          placeholder="64GB · Black, or 2.4GHz dual-band"
          value={attrs.variant_spec ?? ""}
          onChange={(v) => onChange({ variant_spec: v })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="size"
            label="Size"
            placeholder="M / 42 / 16.5"
            value={attrs.size ?? ""}
            onChange={(v) => onChange({ size: v })}
          />
          <Field
            id="color"
            label="Colour"
            placeholder="Navy"
            value={attrs.color ?? ""}
            onChange={(v) => onChange({ color: v })}
          />
        </div>
      </FeatureGate>
      <FeatureGate module="batch_tracking">
        <Field
          id="batch"
          label="Batch / lot number"
          placeholder="LOT-2026-041"
          value={attrs.batch_number ?? ""}
          onChange={(v) => onChange({ batch_number: v })}
        />
      </FeatureGate>
      <FeatureGate module="expiry_alerts">
        <Field
          id="expiry"
          label="Expiry date"
          type="date"
          value={attrs.expiry_date ?? ""}
          onChange={(v) => onChange({ expiry_date: v })}
        />
      </FeatureGate>
      <FeatureGate module="dosage">
        <Field
          id="dosage"
          label="Dosage / strength"
          placeholder="500mg · 1 tab 8-hourly"
          value={attrs.dosage ?? ""}
          onChange={(v) => onChange({ dosage: v })}
        />
      </FeatureGate>
      <FeatureGate module="prescription">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Prescription required</p>
            <p className="text-muted-foreground text-xs">Cashier must confirm Rx before checkout.</p>
          </div>
          <Switch
            checked={Boolean(attrs.prescription_required)}
            onCheckedChange={(v) => onChange({ prescription_required: v })}
          />
        </div>
      </FeatureGate>
      <FeatureGate module="bulk_units">
        <Field
          id="unit"
          label="Sell unit"
          placeholder="bag · kg · piece · metre"
          value={attrs.unit ?? ""}
          onChange={(v) => onChange({ unit: v })}
        />
      </FeatureGate>
      <FeatureGate module="seasonal_lots">
        <Field
          id="season"
          label="Season / planting window"
          placeholder="Long rains 2026"
          value={attrs.season ?? ""}
          onChange={(v) => onChange({ season: v })}
        />
      </FeatureGate>
      <FeatureGate module="service_duration">
        <Field
          id="duration"
          label="Default duration (minutes)"
          type="number"
          placeholder="45"
          value={attrs.duration_minutes ?? ""}
          onChange={(v) => onChange({ duration_minutes: v })}
        />
      </FeatureGate>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
