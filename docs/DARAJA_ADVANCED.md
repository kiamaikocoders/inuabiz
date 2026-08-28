# InuaBiz — Daraja Advanced (PRD Addendum)

Source: `InuaBiz_PRD_Addendum_Daraja_Advanced.pdf`  
Live sandbox rail: **Daraja Lipa Na M-Pesa Express** for POS + SaaS. Ratiba is live. Bill Manager waits on Safaricom opt-in (`app_key`).

## Implemented

### M-Pesa Express (STK)

| Piece | Detail |
|-------|--------|
| SaaS | `create-subscription-charge` → **PayHero** STK (plan amount from DB) |
| Extra shop | `provision-shop` → PayHero STK |
| Callback | `payhero-webhook` → `subscription_payments` + tenant ACTIVE |
| Poll | `poll-pending-payments` → PayHero `/transaction-status` |
| POS | **No platform STK** — `checkout-sale` opens PENDING sale; C2B or manual confirm |

### C2B (Paybill / Till — vendor sales)

| Piece | Detail |
|-------|--------|
| Register | `register-c2b-urls` → shortcode `600984` |
| Validation | `daraja-c2b-validation` accepts all sandbox posts |
| Confirmation | `daraja-c2b-confirmation` matches BillRef to a sale or queues unclaimed |

### M-Pesa Ratiba (standing orders)

| Piece | Detail |
|-------|--------|
| Opt-in | `create-ratiba-standing-order` → Daraja `/standingorder/v1/createStandingOrderExternal` |
| Callback | `ratiba-callback` enables `auto_debit_enabled`, extends `access_until` +30d |
| Schema | `subscriptions.ratiba_standing_order_id`, `auto_debit_enabled`, `next_billing_date`, retry fields |
| Failures | Up to 3 retries / 72h; then tenant `PAST_DUE` (write lock via `tenant_is_write_locked`) |
| Audit | `ratiba_debit_attempts` + `payment_transactions` channel `RATIBA` |
| Cron | `process-ratiba-retries` reconciles missed callbacks |

### M-Pesa Bill Manager (e-invoicing)

| Piece | Detail |
|-------|--------|
| Opt-in | `bill-manager-optin` → `/v1/billmanager-invoice/optin` (sandbox currently 504) |
| Create | `create-bill-invoice` → `/v1/billmanager-invoice/single-invoicing` (needs real `app_key`) |
| Pay | Buyer pays from M-Pesa Bill Manager menu → `bill-manager-callback` → `PAID` |
| Cancel | `cancel-bill-invoice` |
| Schema | `bill_invoices` (RLS by tenant) |

## More capabilities we can unlock with Daraja (not yet built)

These are natural next products once Ratiba + Bill Manager credentials are production-mapped:

1. **C2B validation & confirmation** — Built for sandbox shortcode `600984`; production mapping still needed.
2. **B2C disbursements** — Instant vendor payouts / supplier settlements / cashback to customers from the platform wallet.
3. **B2B transfers** — Wholesaler ↔ retailer stock financing settlements between shortcodes.
4. **Dynamic QR (Lipa Na M-Pesa QR)** — Printable till QR per cart total for silent checkout when STK fails or phone is offline-ish.
5. **Transaction status + account balance APIs** — Admin health: “is shortcode solvent?”, stuck-payment investigation without IntaSend.
6. **Reversals** — One-click reverse of mistaken STK/Bill Manager payments with full audit.
7. **Bill Manager bulk invoicing** — Nightly batch of 100–1000 school/wholesale invoices (API caps at 1,000).
8. **Bill Manager opt-in per tenant** — Let each vendor register their own shortcode/logo so invoices show *their* brand, not only InuaBiz’s.
9. **Ratiba for customer credit** — Standing orders for regulars paying down duka debt weekly/monthly (not only SaaS).
10. **Tax remittance API** — Auto-split VAT/turnover tax to KRA where applicable for formalising MSMEs.
11. **M-Pesa Express (native STK)** — Live for POS + SaaS. IntaSend remains as an optional second rail.
12. **Simulation & sandbox matrix** — Automated CI that hits sandbox Ratiba + Bill Manager + STK for release gates.

## Credential checklist (Developer Portal)

| Portal product | InuaBiz use | Status in addendum |
|----------------|-------------|--------------------|
| Lipa Na M-Pesa Sandbox | Express STK | Enabled |
| M-Pesa Sandbox (C2B/B2C/B2B) | Listen / payouts | Enabled |
| M-Pesa Ratiba Sandbox | SaaS auto-debit | Phase 2 mapping |
| Bill Manager Sandbox | Vendor e-invoices | Phase 3 mapping |

MVP collects via **Daraja Lipa Na M-Pesa Express**. Bill Manager invoices stay blocked until Safaricom returns a real `app_key` from opt-in.
