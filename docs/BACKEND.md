# InuaBiz Backend

Supabase project: `https://hnzzkmifgufurkqvnchp.supabase.co`

Backend is ready for wiring once UI/UX ships. Frontend should stay on React + Tailwind; call these RPCs and Edge Functions.

## What is live

### Database (16 tables, RLS on)

| Domain | Tables |
|--------|--------|
| Tenancy | `tenants`, `profiles`, `tenant_payment_destinations`, `subscriptions` (+ Ratiba columns) |
| POS | `products`, `sales`, `sale_items`, `customers`, `credit_entries` |
| Payments | `payment_transactions`, `unclaimed_payments`, `bill_invoices`, `ratiba_debit_attempts` |
| Ops | `notifications`, `notification_preferences`, `platform_broadcasts`, `ai_insights`, `admin_impersonation_audit`, `admin_ai_runs` |

### RPCs

| RPC | Who | Purpose |
|-----|-----|---------|
| `complete_vendor_onboarding` | authenticated | Creates tenant, payment destination, 14-day trial, sample product |
| `tenant_has_access` | authenticated | Gate POS when trial/subscription expired |
| `customer_credit_balance` | authenticated | Duka debt balance for a customer |

### Edge Functions

| Function | JWT | Purpose |
|----------|-----|---------|
| `checkout-sale` | yes | POS cart → sale + cash/credit/**vendor M-Pesa wait** (no platform STK) |
| `confirm-sale-mpesa` | yes | Manual M-Pesa code confirm for personal/Pochi vendors |
| `create-subscription-charge` | yes | **PayHero** STK Push — vendor pays InuaBiz subscription |
| `payhero-webhook` | **no** | PayHero callback → activate subscription / extra shop |
| `provision-shop` | yes | Extra shop via **PayHero** STK (KES 3,000) |
| `create-sale-charge` | yes | **Deprecated** — returns 410 (vendor sales use checkout-sale MPESA) |
| `daraja-stk-callback` | **no** | Legacy Safaricom STK (pre-PayHero subscription rows only) |
| `daraja-c2b-confirmation` | **no** | Till/Paybill C2B → match `tenant_payment_destinations` + open sale |
| `daraja-c2b-validation` | **no** | Accept C2B payments (sandbox) |
| `register-c2b-urls` | **no** | Register C2B confirmation/validation URLs (`x-cron-secret`) |
| `intasend-webhook` | **no** | **Legacy** IntaSend callbacks (replaced by PayHero) |
| `poll-pending-payments` | **no** | Cron: PayHero status (+ legacy Daraja STK) for PENDING > 3 min |
| `assign-unclaimed-payment` | yes | Super-admin maps orphan payment to tenant |
| `generate-ai-insights` | yes | Weekly cash-flow / bestsellers / reorder (heuristic + optional OpenAI) |
| `create-ratiba-standing-order` | yes | Opt vendor into M-Pesa Ratiba monthly KES 3,000 auto-debit |
| `ratiba-callback` | **no** | Daraja standing-order / debit callbacks → renew or PAST_DUE lock |
| `process-ratiba-retries` | **no** | Cron: after 3 failures / 72h, soft-lock tenant writes |
| `create-bill-invoice` | yes | Push Bill Manager e-invoice to buyer M-Pesa menu |
| `bill-manager-callback` | **no** | Mark `bill_invoices` PAID on Safaricom payment callback |
| `cancel-bill-invoice` | yes | Cancel a SENT Bill Manager invoice |
| `bill-manager-optin` | **no** | One-time Bill Manager shortcode opt-in (`x-cron-secret`) |

### Admin AI (operator copilot)

Vendor AI stays on `ai_insights` + `generate-ai-insights`. Super-admin AI is separate:

- UI: `/admin/ai` plus draft/match/brief hooks on broadcasts, unclaimed, tenant support
- LLM: server-only WYA Vercel AI Gateway (`askAi` in `src/lib/ai-server.ts`)
- Ledger: `admin_ai_runs` (super-admin RLS) for briefing, churn, unclaimed, broadcast, tenant_brief, chat

### Triggers

- Auth signup → `profiles` + notification prefs
- Sale → `PAID` decrements stock + in-app sale notification
- Product stock crosses low threshold → stock notification
- Onboarding notifies super-admins

### Views

- `admin_tenant_map` — GIS + status for Mapbox
- `admin_mrr_snapshot` — MRR / trials / conversions
- `customer_loyalty_stats` — quiet loyalty by phone

Realtime publication includes `notifications`.

## Payment architecture

| Flow | Rail | Money lands on |
|------|------|----------------|
| **Subscription** (vendor → InuaBiz) | PayHero STK | InuaBiz PayHero channel (wallet → till in Phase 2) |
| **POS sale** (customer → vendor) | Daraja C2B listener + manual code | Vendor till/paybill/phone from onboarding |

PayHero webhook URL:

```
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/payhero-webhook
```

## Secrets to set (Dashboard → Edge Functions → Secrets)

> **Note:** Supabase MCP cannot write Dashboard Edge secrets. Daraja sandbox credentials
> are stored via MCP in `private.app_secrets` and read by Edge Functions through
> `public.get_app_secret` (service_role only). Dashboard env vars still override if set.

```bash
# PayHero — InuaBiz subscription collection (vendor → platform)
PAYHERO_AUTH_TOKEN=               # Basic auth token from app.payhero.co.ke → API Keys
PAYHERO_CHANNEL_ID=               # Phase 1: service wallet channel; Phase 2: Buy Goods till channel

SUBSCRIPTION_AMOUNT_KES=3000      # also in private.app_secrets
CRON_SECRET=                      # poll-pending-payments + process-ratiba-retries
OPENAI_API_KEY=                   # optional; heuristic works without it
OPENAI_MODEL=gpt-4o-mini

# Legacy IntaSend (deprecated — do not configure for new deployments)
# INTASEND_SECRET_KEY=
# INTASEND_PUBLISHABLE_KEY=

# Safaricom Daraja 2.0 — sandbox values live in private.app_secrets (MCP)
DARAJA_CONSUMER_KEY=              # optional override
DARAJA_CONSUMER_SECRET=
DARAJA_BUSINESS_SHORTCODE=600984  # C2B / Ratiba app shortcode
DARAJA_STK_SHORTCODE=174379
DARAJA_C2B_SHORTCODE=600984
DARAJA_BILL_MANAGER_SHORTCODE=718003
DARAJA_SANDBOX=true
DARAJA_RATIBA_FREQUENCY=4
DARAJA_BILL_MANAGER_APP_KEY=      # set from live Bill Manager opt-in (not SANDBOX_APP_KEY)
DARAJA_PASSKEY=                   # Lipa Na M-Pesa Express passkey
DARAJA_MOCK=false                 # true only to skip live Safaricom HTTP
```

Also configure **Phone OTP / SMS** under Auth providers.

Callback URLs:

```text
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/daraja-stk-callback
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/daraja-c2b-confirmation
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/daraja-c2b-validation
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/ratiba-callback
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/bill-manager-callback
https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/intasend-webhook
```

Schedule every ~2–5 minutes with `x-cron-secret: <CRON_SECRET>`:

- `poll-pending-payments`
- `process-ratiba-retries`

## Frontend env

```env
VITE_SUPABASE_URL=https://hnzzkmifgufurkqvnchp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon or publishable key from dashboard>
```

Generated types: `supabase/types/database.ts`

## Client call examples

```ts
// Onboarding
await supabase.rpc('complete_vendor_onboarding', {
  p_business_name: 'Mama Njoroge Duka',
  p_category: 'DUKA',
  p_phone: '0712345678',
  p_destination_type: 'PERSONAL_MPESA',
  p_account_number: '254712345678',
  p_location_lat: -1.2921,
  p_location_lng: 36.8219,
})

// POS checkout (cash / credit / Daraja STK)
await supabase.functions.invoke('checkout-sale', {
  body: {
    items: [{ product_id, qty: 1 }],
    discount_amount: 0,
    channel: 'MPESA_STK',
    customer_phone: '0712345678',
  },
})

// SaaS charge
await supabase.functions.invoke('create-subscription-charge', { body: { phone: '0712345678' } })

// Sale STK (existing sale)
await supabase.functions.invoke('create-sale-charge', {
  body: { sale_id, customer_phone: '0712345678' },
})

// Ratiba monthly auto-debit opt-in
await supabase.functions.invoke('create-ratiba-standing-order', {
  body: { phone: '0712345678' },
})

// Bill Manager e-invoice
await supabase.functions.invoke('create-bill-invoice', {
  body: {
    billed_full_name: 'Wanjiku Traders',
    billed_phone: '0712345678',
    invoice_name: 'Wholesale order',
    amount: 15000,
    invoice_items: [
      { item_name: 'Cooking oil 20L', amount: 10000 },
      { item_name: 'Sugar 50kg', amount: 5000 },
    ],
  },
})
```

## Daraja addendum (Phases 2–3)

See [DARAJA_ADVANCED.md](./DARAJA_ADVANCED.md) for Ratiba / Bill Manager behaviour and future capabilities.

## Super-admin bootstrap

After your first phone login, promote in SQL Editor:

```sql
update public.profiles
set role = 'SUPER_ADMIN', tenant_id = null
where phone = '2547XXXXXXXX';

update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'SUPER_ADMIN')
where phone = '2547XXXXXXXX';
```

## Intentionally deferred

- Mapbox GIS UI
- Resend / SMS / WhatsApp fan-out beyond in-app inserts
- Impersonation session Edge Function (audit table ready)
- Offline POS sync

## Source docs

- `InuaBiz_PRD_Document.pdf`
- `InuaBiz_IntaSend_Integration_Guide.pdf`
- `InuaBiz_Notification_System_Architecture.pdf`
- `InuaBiz_PRD_Addendum_Daraja_Advanced.pdf`
- Plan canvas: implementation plan (phases 0–7)
