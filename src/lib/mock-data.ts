/**
 * Shared money helpers, pricing defaults, and domain types.
 * Live till data comes from Supabase — this file does not hold demo shops or SKUs.
 */

export const KES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

export const KES2 = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n);

export const SUBSCRIPTION_PRICE = 3000;
export const COMPLIANCE_PRICE = 4500;
export const SETUP_FEE = 1000;
export const TRIAL_DAYS = 3;

import type { ProductAttrs } from "@/lib/category";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  reorderLevel: number;
  emoji: string;
  taxClass?: "STANDARD_16" | "ZERO_RATED" | "EXEMPT";
  classificationCode?: string;
  attrs?: ProductAttrs;
};

export type Sale = {
  id: string;
  ref: string;
  time: string;
  items: number;
  total: number;
  channel: "M-Pesa STK" | "M-Pesa" | "PayHero" | "Cash" | "Till" | "Paybill" | "Credit";
  customer: string;
  status: "Complete" | "Pending" | "Failed";
  createdAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  spend: number;
  debt: number;
  lastSeen: string;
  tier: "Regular" | "Loyal" | "VIP";
};

export type DebtEntry = {
  id: string;
  customer: string;
  phone: string;
  amount: number;
  taken: string;
  due: string;
  status: "Current" | "Due soon" | "Overdue";
  lastReminder: string;
};

export type Insight = {
  id: string;
  title: string;
  body: string;
  kind: "Forecast" | "Reorder" | "Pricing" | "Customer";
  confidence: number;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "SALE" | "STOCK_LOW" | "SUBSCRIPTION" | "SYSTEM" | "CREDIT";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  read: boolean;
  time: string;
  createdAt?: string;
  tenantId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type Invoice = {
  id: string;
  number: string;
  buyer: string;
  phone: string;
  amount: number;
  issued: string;
  due: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  channel: "Bill Manager" | "STK Push";
};

export type Tenant = {
  id: string;
  business: string;
  owner: string;
  phone: string;
  category: string;
  town: string;
  status: "Active" | "Trial" | "Error" | "Suspended";
  mrr: number;
  joined: string;
  lat: number;
  lng: number;
  createdAt?: string;
};

export type UnclaimedPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  account: string;
  apiRef: string;
  received: string;
  reason: string;
};

export type AdminNotificationDomain =
  | "unclaimed"
  | "vendors"
  | "subscriptions"
  | "webhooks"
  | "ai"
  | "comms"
  | "health";

export type AdminNotificationItem = NotificationItem & {
  domain: AdminNotificationDomain;
  domainLabel: string;
  day: "today" | "yesterday" | "earlier";
  dayLabel: string;
  clock: string;
  occurredAt: string;
  receivedDetail: string;
  firstSeen: string;
  lastUpdate: string;
  source: string;
  owner: string;
  tenant: string;
  shop: string;
  phone: string;
  plan: string;
  invoice: string;
  amount: string;
  email: string;
  contactId: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  detailRows: Array<[string, string]>;
};

export const statusColor: Record<string, string> = {
  Active: "bg-success/15 text-success border-success/30",
  Trial: "bg-warning/20 text-warning-foreground border-warning/40",
  Error: "bg-destructive/15 text-destructive border-destructive/30",
  Suspended: "bg-muted text-muted-foreground border-border",
};
