import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ServiceClient = SupabaseClient;

export async function notifyAdmins(
  service: ServiceClient,
  title: string,
  message: string,
  type: string,
  priority: string,
  metadata: Record<string, unknown>,
) {
  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true);

  if (!admins?.length) return;

  await service.from("notifications").insert(
    admins.map((a) => ({
      recipient_id: a.id,
      recipient_role: "SUPER_ADMIN",
      title,
      message,
      type,
      priority,
      metadata,
    })),
  );
}

export async function applyCompleteSubscription(
  service: ServiceClient,
  tenantId: string,
  invoiceId: string,
  mpesaReceipt?: string | null,
) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await service
    .from("tenants")
    .update({
      status: "ACTIVE",
      access_until: periodEnd.toISOString(),
    })
    .eq("id", tenantId);

  await service
    .from("subscriptions")
    .update({
      status: "ACTIVE",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      last_invoice_id: mpesaReceipt ?? invoiceId,
    })
    .eq("tenant_id", tenantId);

  await notifyAdmins(
    service,
    "SaaS subscription paid",
    `Tenant ${tenantId} paid via PayHero. Access extended 30 days.`,
    "SUBSCRIPTION",
    "NORMAL",
    { tenant_id: tenantId, invoice_id: invoiceId },
  );

  const { data: vendors } = await service
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "VENDOR_ADMIN");

  if (vendors?.length) {
    await service.from("notifications").insert(
      vendors.map((v) => ({
        tenant_id: tenantId,
        recipient_id: v.id,
        recipient_role: "VENDOR_ADMIN",
        title: "Subscription active",
        message: "Your InuaBiz plan is active for 30 more days. Asante!",
        type: "SUBSCRIPTION",
        priority: "HIGH",
        metadata: { invoice_id: invoiceId },
      })),
    );
  }
}

export async function applyShopAddon(
  service: ServiceClient,
  tenantId: string,
  metadata: Record<string, unknown> | null | undefined,
) {
  const shop = metadata?.shop as
    | { name?: string; category?: string; address_text?: string | null }
    | undefined;
  if (!shop?.name) return;

  const { count } = await service
    .from("shops")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("name", shop.name);
  if (count && count > 0) return;

  await service.from("shops").insert({
    tenant_id: tenantId,
    name: shop.name,
    category: shop.category ?? "DUKA",
    address_text: shop.address_text ?? null,
    is_default: false,
  });
}

export function parseSubscriptionExternalRef(
  externalRef: string,
): { kind: "subscription" | "shop_addon" | "unknown"; tenantId: string | null } {
  const sub = externalRef.match(/^SUB[_-]?([0-9a-f-]{36})$/i);
  if (sub) return { kind: "subscription", tenantId: sub[1] };

  const shop = externalRef.match(/^shopadd[_-]?([0-9a-f-]{36})$/i);
  if (shop) return { kind: "shop_addon", tenantId: shop[1] };

  const bare = externalRef.match(/^([0-9a-f-]{36})$/i);
  if (bare) return { kind: "subscription", tenantId: bare[1] };

  return { kind: "unknown", tenantId: null };
}
