import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShop, fetchShops, fetchTenantHeader, setActiveShop } from "@/lib/ops";
import { fetchProfile } from "@/lib/auth";
import { isVendorOwner } from "@/lib/identity";
import { invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { fetchBillingSnapshot, pollSubscriptionPayment } from "@/lib/payments";
import { fetchPublicPricing } from "@/lib/plans";
import { KES, SUBSCRIPTION_PRICE } from "@/lib/mock-data";
import { CATEGORY_LIST, categoryLabel, parseCategory } from "@/lib/category";
import { formatCoords, mapsUrl } from "@/lib/geo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/shops")({
  head: () => ({
    meta: [{ title: "Shops — InuaBiz" }],
  }),
  component: ShopsPage,
});

function ShopsPage() {
  const queryClient = useQueryClient();
  const { data: shops = [] } = useQuery({ queryKey: ["shops"], queryFn: fetchShops });
  const { data: profile } = useQuery({ queryKey: ["identity"], queryFn: fetchProfile });
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured(),
  });
  const { data: pricing } = useQuery({ queryKey: ["public-pricing"], queryFn: fetchPublicPricing });
  const { data: billing } = useQuery({ queryKey: ["billing"], queryFn: fetchBillingSnapshot });
  const owner = isVendorOwner(profile?.role ?? "VENDOR_ADMIN");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("DUKA");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [stkHint, setStkHint] = useState("");

  const shopAddon =
    pricing?.shopMonthly ??
    (billing?.amount && shops.length > 0
      ? Math.round(billing.amount / Math.max(shops.length, 1))
      : SUBSCRIPTION_PRICE);

  const activeId = profile?.active_shop_id ?? shops.find((s) => s.is_default)?.id ?? shops[0]?.id;
  const active = shops.find((s) => s.id === activeId) ?? shops[0];

  const addShop = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (!isSupabaseConfigured() || shops.length === 0) {
        await createShop({ name: name.trim(), category, address_text: address.trim() });
        toast.success("Shop added");
      } else {
        const { data, error } = await invokeFunction<{
          ok?: boolean;
          transaction?: { invoice_id?: string };
          checkout_request_id?: string;
          payhero_reference?: string;
          message?: string;
        }>("provision-shop", {
          name: name.trim(),
          category,
          address_text: address.trim(),
          phone: payPhone || profile?.phone,
        });
        if (error || !data?.ok) {
          throw new Error(error ?? "Could not send the M-Pesa prompt.");
        }
        const invoiceId =
          data.transaction?.invoice_id ?? data.payhero_reference ?? data.checkout_request_id;
        setStkHint(data.message ?? "Enter PIN on your phone.");
        if (!invoiceId) {
          toast.info("Check your phone", { description: data.message });
          return;
        }
        toast.info("Enter M-Pesa PIN", { description: `${KES(shopAddon)} to add this shop.` });
        const result = await pollSubscriptionPayment(invoiceId, 120_000, {
          alternateIds: [data.checkout_request_id ?? "", data.payhero_reference ?? ""].filter(
            Boolean,
          ),
        });
        if (result !== "COMPLETE") {
          throw new Error(
            result === "FAILED"
              ? "PIN cancelled or timed out. The shop was not created."
              : "Still waiting for PIN. Try again if the shop does not appear.",
          );
        }
        toast.success("Shop added", { description: "Paid. This location is now on your account." });
      }
      setOpen(false);
      setName("");
      setAddress("");
      setStkHint("");
      await queryClient.invalidateQueries({ queryKey: ["shops"] });
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    } catch (err) {
      toast.error("Could not add shop", {
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (shopId: string, shopName: string) => {
    void setActiveShop(shopId)
      .then(() => {
        toast.success(`Switched to ${shopName}`);
        void queryClient.invalidateQueries();
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not switch shop"),
      );
  };

  return (
    <AppShell
      title="Shops"
      description="Every counter under this business. Switch active shop without mixing stock or sales."
      actions={
        owner ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 size-4" /> Add shop
          </Button>
        ) : undefined
      }
    >
      {active && (
        <div className="bg-hero-gradient relative mb-5 overflow-hidden rounded-2xl p-6 shadow-lift">
          <div className="grid-paper absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="bg-primary-foreground/15 text-primary-foreground grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl">
                {header?.logo_url ? (
                  <img src={header.logo_url} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-7" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-gold text-xs font-semibold tracking-widest uppercase">
                  Active till
                </p>
                <h2 className="text-primary-foreground mt-1 truncate font-display text-2xl font-bold">
                  {active.name}
                </h2>
                <p className="text-primary-foreground/75 mt-1 text-sm">
                  {categoryLabel(active.category)}
                  {active.address_text ? ` · ${active.address_text}` : ""}
                </p>
                {(active.location_lat != null && active.location_lng != null) ||
                (header?.location_lat != null && header?.location_lng != null) ? (
                  <a
                    className="text-primary-foreground/80 mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                    href={mapsUrl({
                      lat: Number(active.location_lat ?? header?.location_lat),
                      lng: Number(active.location_lng ?? header?.location_lng),
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="size-3" />
                    Open map pin
                  </a>
                ) : null}
              </div>
            </div>
            <Badge className="bg-gold text-gold-foreground border-transparent">Selling here</Badge>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {shops.map((shop) => {
          const isActive = shop.id === activeId;
          const cat = CATEGORY_LIST.find((c) => c.id === parseCategory(shop.category));
          const lat = shop.location_lat ?? header?.location_lat;
          const lng = shop.location_lng ?? header?.location_lng;
          const place =
            shop.address_text ||
            header?.address_text ||
            (lat != null && lng != null ? `Pin · ${formatCoords({ lat: Number(lat), lng: Number(lng) })}` : null);
          return (
            <button
              key={shop.id}
              type="button"
              onClick={() => switchTo(shop.id, shop.name)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all",
                isActive
                  ? "border-primary/40 bg-primary-soft/40 shadow-sm"
                  : "border-border bg-card hover:border-primary/25 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="bg-muted grid size-11 shrink-0 place-items-center rounded-xl text-lg">
                    {cat?.emoji ?? "🏪"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{shop.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{categoryLabel(shop.category)}</p>
                    {place && (
                      <p className="text-muted-foreground mt-2 flex items-start gap-1 text-xs leading-relaxed">
                        <MapPin className="mt-0.5 size-3 shrink-0" />
                        <span className="line-clamp-2">{place}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {isActive ? (
                    <Badge className="gap-1">
                      <Check className="size-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="opacity-0 transition-opacity group-hover:opacity-100">
                      Switch
                    </Badge>
                  )}
                  {shop.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!shops.length && (
        <p className="text-muted-foreground mt-6 text-sm">No shops yet. Add your first location.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a shop</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Pay {KES(shopAddon)} by M-Pesa first. The new shop is created only after the PIN succeeds.
          </p>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Shop name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ngara branch" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_LIST.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={header?.address_text ?? "Street, estate, town"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>M-Pesa number</Label>
              <Input
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                placeholder={profile?.phone ?? "0712 000 000"}
              />
            </div>
          </div>
          {stkHint && <p className="text-muted-foreground text-xs">{stkHint}</p>}
          <DialogFooter>
            <Button onClick={() => void addShop()} disabled={busy || !name.trim()}>
              {busy ? "Waiting for PIN…" : `Pay ${KES(shopAddon)} and create`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
