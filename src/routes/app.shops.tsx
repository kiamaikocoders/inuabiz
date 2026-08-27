import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
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
import { createShop, fetchShops, setActiveShop } from "@/lib/ops";
import { fetchProfile } from "@/lib/auth";
import { isVendorOwner } from "@/lib/identity";
import { invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { fetchBillingSnapshot, pollSubscriptionPayment } from "@/lib/payments";
import { fetchPublicPricing } from "@/lib/plans";
import { KES } from "@/lib/mock-data";
import { CATEGORY_LIST, categoryLabel } from "@/lib/category";

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
      : 3000);

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

  return (
    <AppShell
      title="Shops"
      description={`Locations under this business. First shop is in the trial. Extra shops: pay ${KES(shopAddon)} on M-Pesa, then the shop is created.`}
      actions={
        owner ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 size-4" /> Add shop
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            className="surface-card p-5 text-left"
            onClick={() => {
              void setActiveShop(shop.id)
                .then(() => {
                  toast.success(`Switched to ${shop.name}`);
                  void queryClient.invalidateQueries();
                })
                .catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : "Could not switch shop"),
                );
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-semibold">{shop.name}</p>
              <div className="flex gap-1">
                {shop.is_default && <Badge variant="secondary">Default</Badge>}
                {profile?.active_shop_id === shop.id && <Badge>Active</Badge>}
              </div>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{categoryLabel(shop.category)}</p>
            {shop.address_text && (
              <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                <MapPin className="size-3" /> {shop.address_text}
              </p>
            )}
          </button>
        ))}
      </div>

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
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
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
