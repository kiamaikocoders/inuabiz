/**
 * Front-end mock data for InuaBiz.
 * No backend is wired yet — every value here is static demo data that will be
 * replaced by real queries later.
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

export const products: Product[] = [
  { id: "p1", name: "Unga Pembe 2kg", sku: "UNG-2K", category: "Staples", cost: 155, price: 195, stock: 42, reorderLevel: 12, emoji: "🌾" },
  { id: "p2", name: "Sukari Kabras 1kg", sku: "SUK-1K", category: "Staples", cost: 140, price: 175, stock: 8, reorderLevel: 15, emoji: "🍬" },
  { id: "p3", name: "Cooking Oil 1L", sku: "OIL-1L", category: "Staples", cost: 280, price: 340, stock: 23, reorderLevel: 10, emoji: "🛢️" },
  { id: "p4", name: "Fresh Milk 500ml", sku: "MLK-500", category: "Dairy", cost: 55, price: 70, stock: 60, reorderLevel: 24, emoji: "🥛" },
  { id: "p5", name: "Bread Supa Loaf", sku: "BRD-400", category: "Bakery", cost: 60, price: 75, stock: 14, reorderLevel: 10, emoji: "🍞" },
  { id: "p6", name: "Omo Sachet 500g", sku: "OMO-500", category: "Household", cost: 110, price: 140, stock: 31, reorderLevel: 12, emoji: "🧼" },
  { id: "p7", name: "Blue Band 250g", sku: "BLB-250", category: "Dairy", cost: 165, price: 210, stock: 5, reorderLevel: 8, emoji: "🧈" },
  { id: "p8", name: "Rice Pishori 1kg", sku: "RIC-1K", category: "Staples", cost: 190, price: 240, stock: 27, reorderLevel: 10, emoji: "🍚" },
  { id: "p9", name: "Panadol 12s", sku: "PAN-12", category: "Pharmacy", cost: 90, price: 130, stock: 18, reorderLevel: 6, emoji: "💊" },
  { id: "p10", name: "Soda 500ml", sku: "SOD-500", category: "Drinks", cost: 45, price: 65, stock: 74, reorderLevel: 24, emoji: "🥤" },
  { id: "p11", name: "Airtime KES 50", sku: "AIR-50", category: "Services", cost: 48, price: 50, stock: 999, reorderLevel: 0, emoji: "📱" },
  { id: "p12", name: "Tea Leaves 250g", sku: "TEA-250", category: "Staples", cost: 120, price: 160, stock: 9, reorderLevel: 12, emoji: "🍵" },
];

export type Sale = {
  id: string;
  ref: string;
  time: string;
  items: number;
  total: number;
  channel: "M-Pesa STK" | "M-Pesa" | "PayHero" | "Cash" | "Till" | "Paybill" | "Credit";
  customer: string;
  status: "Complete" | "Pending" | "Failed";
};

export const sales: Sale[] = [
  { id: "s1", ref: "SL-10231", time: "08:12", items: 3, total: 640, channel: "M-Pesa STK", customer: "Mary W.", status: "Complete" },
  { id: "s2", ref: "SL-10232", time: "08:41", items: 1, total: 175, channel: "Cash", customer: "Walk-in", status: "Complete" },
  { id: "s3", ref: "SL-10233", time: "09:05", items: 6, total: 1280, channel: "Till", customer: "John K.", status: "Complete" },
  { id: "s4", ref: "SL-10234", time: "09:52", items: 2, total: 410, channel: "Credit", customer: "Mama Njeri", status: "Pending" },
  { id: "s5", ref: "SL-10235", time: "10:20", items: 4, total: 905, channel: "M-Pesa STK", customer: "Peter O.", status: "Complete" },
  { id: "s6", ref: "SL-10236", time: "10:47", items: 1, total: 65, channel: "Cash", customer: "Walk-in", status: "Complete" },
  { id: "s7", ref: "SL-10237", time: "11:15", items: 8, total: 2140, channel: "Paybill", customer: "Grace M.", status: "Complete" },
  { id: "s8", ref: "SL-10238", time: "11:38", items: 2, total: 320, channel: "M-Pesa STK", customer: "Walk-in", status: "Failed" },
];

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

export const customers: Customer[] = [
  { id: "c1", name: "Mama Njeri", phone: "0722 431 002", visits: 42, spend: 38400, debt: 1250, lastSeen: "Today", tier: "VIP" },
  { id: "c2", name: "John Kamau", phone: "0711 908 221", visits: 28, spend: 21100, debt: 0, lastSeen: "Today", tier: "Loyal" },
  { id: "c3", name: "Grace Muthoni", phone: "0733 552 610", visits: 19, spend: 15600, debt: 480, lastSeen: "Yesterday", tier: "Loyal" },
  { id: "c4", name: "Peter Otieno", phone: "0745 220 118", visits: 12, spend: 8200, debt: 0, lastSeen: "2 days ago", tier: "Regular" },
  { id: "c5", name: "Mary Wanjiru", phone: "0700 314 559", visits: 33, spend: 27750, debt: 2100, lastSeen: "Today", tier: "VIP" },
  { id: "c6", name: "Ali Hassan", phone: "0798 640 371", visits: 7, spend: 4100, debt: 760, lastSeen: "5 days ago", tier: "Regular" },
];

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

export const debts: DebtEntry[] = [
  { id: "d1", customer: "Mary Wanjiru", phone: "0700 314 559", amount: 2100, taken: "12 Aug", due: "19 Aug", status: "Due soon", lastReminder: "2 days ago" },
  { id: "d2", customer: "Mama Njeri", phone: "0722 431 002", amount: 1250, taken: "14 Aug", due: "21 Aug", status: "Current", lastReminder: "—" },
  { id: "d3", customer: "Ali Hassan", phone: "0798 640 371", amount: 760, taken: "01 Aug", due: "08 Aug", status: "Overdue", lastReminder: "Yesterday" },
  { id: "d4", customer: "Grace Muthoni", phone: "0733 552 610", amount: 480, taken: "15 Aug", due: "22 Aug", status: "Current", lastReminder: "—" },
  { id: "d5", customer: "Samuel Kip", phone: "0720 118 993", amount: 3400, taken: "22 Jul", due: "29 Jul", status: "Overdue", lastReminder: "3 days ago" },
];

export const salesTrend = [
  { day: "Mon", sales: 8200, credit: 1200 },
  { day: "Tue", sales: 9400, credit: 900 },
  { day: "Wed", sales: 7100, credit: 1600 },
  { day: "Thu", sales: 11200, credit: 700 },
  { day: "Fri", sales: 14800, credit: 2100 },
  { day: "Sat", sales: 18600, credit: 1400 },
  { day: "Sun", sales: 10300, credit: 500 },
];

export const channelSplit = [
  { channel: "M-Pesa STK", value: 48 },
  { channel: "Till", value: 21 },
  { channel: "Cash", value: 18 },
  { channel: "Paybill", value: 9 },
  { channel: "Credit", value: 4 },
];

export const cashflowForecast = [
  { week: "W1", actual: 62000, forecast: 62000 },
  { week: "W2", actual: 71000, forecast: 69000 },
  { week: "W3", actual: 66500, forecast: 68000 },
  { week: "W4", actual: 79600, forecast: 77000 },
  { week: "W5", actual: null, forecast: 84000 },
  { week: "W6", actual: null, forecast: 88500 },
];

export type Insight = {
  id: string;
  title: string;
  body: string;
  kind: "Forecast" | "Reorder" | "Pricing" | "Customer";
  confidence: number;
};

export const insights: Insight[] = [
  {
    id: "i1",
    title: "Restock Sukari Kabras before Friday",
    body: "Sugar sells 23 units/week and you have 8 left. At the current pace you run out Thursday — right before your busiest day.",
    kind: "Reorder",
    confidence: 92,
  },
  {
    id: "i2",
    title: "Next 30 days projected at KES 342,000",
    body: "Cash-flow model projects a 9% month-on-month lift driven by weekend footfall. Keep at least KES 46,000 in working capital.",
    kind: "Forecast",
    confidence: 78,
  },
  {
    id: "i3",
    title: "Cooking Oil margin is below your average",
    body: "You earn 17.6% on oil vs a 24% store average. A KES 15 price adjustment recovers roughly KES 3,100/month.",
    kind: "Pricing",
    confidence: 84,
  },
  {
    id: "i4",
    title: "5 loyal customers went quiet",
    body: "Customers who used to visit weekly have not bought in 14+ days. A WhatsApp nudge typically recovers about 40% of them.",
    kind: "Customer",
    confidence: 71,
  },
];

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "SALE" | "STOCK_LOW" | "SUBSCRIPTION" | "SYSTEM" | "CREDIT";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  read: boolean;
  time: string;
};

export const vendorNotifications: NotificationItem[] = [
  { id: "n1", title: "Sale completed", message: "KES 905 received via M-Pesa STK from Peter O.", type: "SALE", priority: "NORMAL", read: false, time: "2 min ago" },
  { id: "n2", title: "Low stock: Blue Band 250g", message: "Only 5 units left (reorder level 8).", type: "STOCK_LOW", priority: "HIGH", read: false, time: "26 min ago" },
  { id: "n3", title: "Credit overdue", message: "Ali Hassan is 9 days past due on KES 760.", type: "CREDIT", priority: "HIGH", read: false, time: "1 hr ago" },
  { id: "n4", title: "Trial ends in 3 days", message: "Subscribe for KES 3,000/month to keep full access.", type: "SUBSCRIPTION", priority: "CRITICAL", read: true, time: "5 hrs ago" },
  { id: "n5", title: "STK push failed", message: "Customer cancelled the M-Pesa prompt for KES 320.", type: "SYSTEM", priority: "NORMAL", read: true, time: "Yesterday" },
  { id: "n6", title: "Daily summary ready", message: "You sold KES 18,600 across 34 transactions on Saturday.", type: "SYSTEM", priority: "LOW", read: true, time: "Yesterday" },
];

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

export const invoices: Invoice[] = [
  { id: "iv1", number: "INV-2041", buyer: "Kariobangi Wholesalers", phone: "0722 000 411", amount: 84500, issued: "10 Aug", due: "24 Aug", status: "Sent", channel: "Bill Manager" },
  { id: "iv2", number: "INV-2040", buyer: "Zawadi Eatery", phone: "0733 811 220", amount: 12300, issued: "08 Aug", due: "15 Aug", status: "Paid", channel: "Bill Manager" },
  { id: "iv3", number: "INV-2039", buyer: "Njoro Hardware", phone: "0711 552 908", amount: 46000, issued: "28 Jul", due: "11 Aug", status: "Overdue", channel: "STK Push" },
  { id: "iv4", number: "INV-2042", buyer: "Highrise Chemist", phone: "0745 331 007", amount: 21750, issued: "16 Aug", due: "30 Aug", status: "Draft", channel: "Bill Manager" },
];

export const paymentHistory = [
  { id: "t1", invoice: "INV-INUABIZ-88210", date: "16 Jul 2026", amount: 3000, channel: "MPESA_STK", status: "COMPLETE" },
  { id: "t2", invoice: "INV-INUABIZ-87604", date: "16 Jun 2026", amount: 3000, channel: "MPESA_STK", status: "COMPLETE" },
  { id: "t3", invoice: "INV-INUABIZ-86991", date: "16 May 2026", amount: 3000, channel: "CARD", status: "COMPLETE" },
  { id: "t4", invoice: "INV-INUABIZ-86330", date: "16 Apr 2026", amount: 3000, channel: "MPESA_STK", status: "FAILED" },
];

/* ------------------------------- Super Admin ------------------------------- */

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
};

export const tenants: Tenant[] = [
  { id: "t1", business: "Njoroge Mini Mart", owner: "Mama Njoroge", phone: "0722 431 002", category: "Duka", town: "Kasarani", status: "Active", mrr: 3000, joined: "12 Mar 2026", lat: -1.2195, lng: 36.9014 },
  { id: "t2", business: "Highrise Chemist", owner: "Dr. Alice N.", phone: "0733 552 610", category: "Chemist", town: "Ngara", status: "Active", mrr: 3000, joined: "04 Apr 2026", lat: -1.2768, lng: 36.8284 },
  { id: "t3", business: "Zawadi Boutique", owner: "Grace M.", phone: "0711 908 221", category: "Boutique", town: "Westlands", status: "Trial", mrr: 0, joined: "09 Aug 2026", lat: -1.2673, lng: 36.8106 },
  { id: "t4", business: "Njoro Hardware", owner: "Samuel Kip", phone: "0745 220 118", category: "Hardware", town: "Kikuyu", status: "Error", mrr: 3000, joined: "18 Feb 2026", lat: -1.2465, lng: 36.6665 },
  { id: "t5", business: "Mama Oliech Eatery", owner: "Rose A.", phone: "0700 314 559", category: "Eatery", town: "Kilimani", status: "Active", mrr: 3000, joined: "22 Jan 2026", lat: -1.2913, lng: 36.7874 },
  { id: "t6", business: "Kayole Duka Bora", owner: "Ali Hassan", phone: "0798 640 371", category: "Duka", town: "Kayole", status: "Suspended", mrr: 0, joined: "30 Nov 2025", lat: -1.276, lng: 36.905 },
  { id: "t7", business: "Ruiru Fresh Grocers", owner: "Peter O.", phone: "0720 118 993", category: "Duka", town: "Ruiru", status: "Active", mrr: 3000, joined: "07 May 2026", lat: -1.1483, lng: 36.9605 },
  { id: "t8", business: "Lavington Pharma", owner: "Janet W.", phone: "0714 220 553", category: "Chemist", town: "Lavington", status: "Trial", mrr: 0, joined: "13 Aug 2026", lat: -1.276, lng: 36.772 },
];

export const mrrTrend = [
  { month: "Mar", mrr: 12000, tenants: 6 },
  { month: "Apr", mrr: 21000, tenants: 9 },
  { month: "May", mrr: 33000, tenants: 14 },
  { month: "Jun", mrr: 48000, tenants: 20 },
  { month: "Jul", mrr: 63000, tenants: 26 },
  { month: "Aug", mrr: 81000, tenants: 34 },
];

export type UnclaimedPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  account: string;
  apiRef: string;
  received: string;
  reason: string;
};

export const unclaimedPayments: UnclaimedPayment[] = [
  { id: "u1", invoiceId: "INV-INUABIZ-90112", amount: 3000, account: "254712345678", apiRef: "—", received: "16 Aug, 09:14", reason: "Missing api_ref" },
  { id: "u2", invoiceId: "INV-INUABIZ-90108", amount: 3000, account: "254701998221", apiRef: "tenant_uuid_?????", received: "15 Aug, 18:02", reason: "Corrupted tenant reference" },
  { id: "u3", invoiceId: "INV-INUABIZ-90077", amount: 1500, account: "254733552610", apiRef: "tenant_uuid_00000", received: "15 Aug, 11:47", reason: "No matching tenant" },
];

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
  day: "today" | "yesterday";
  clock: string;
  occurredAt: string;
  receivedDetail: string;
  firstSeen: string;
  lastUpdate: string;
  source: string;
  owner: string;
  tenant: string;
  shop: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export const adminNotifications: AdminNotificationItem[] = [
  {
    id: "an1",
    title: "Unclaimed payment — INV-90112",
    message: "KES 3,000 from 254712345678 could not be matched to a tenant. Hold until api_ref is fixed.",
    type: "SYSTEM",
    priority: "CRITICAL",
    read: false,
    time: "9 min ago",
    domain: "unclaimed",
    domainLabel: "Unclaimed",
    day: "today",
    clock: "16:03 EAT",
    occurredAt: "19 Aug 2026 · 16:03 EAT",
    receivedDetail: "Received · 16:03:18 · Latency 2.1s",
    firstSeen: "19 Aug 2026 · 16:01 EAT",
    lastUpdate: "19 Aug 2026 · 16:03 EAT",
    source: "intasend_webhook",
    owner: "Ops · Zack K.",
    tenant: "Unmatched",
    shop: "Till unknown",
    primaryHref: "/admin/unclaimed",
    primaryLabel: "Open unclaimed queue",
    secondaryHref: "/admin/health",
    secondaryLabel: "View webhook health",
  },
  {
    id: "an2",
    title: "New vendor registration",
    message: "Lavington Pharma signed up and started a 3-day trial.",
    type: "SYSTEM",
    priority: "HIGH",
    read: false,
    time: "1h ago",
    domain: "vendors",
    domainLabel: "Vendors",
    day: "today",
    clock: "15:18 EAT",
    occurredAt: "19 Aug 2026 · 15:18 EAT",
    receivedDetail: "Received · 15:18:04 · Latency 0.4s",
    firstSeen: "19 Aug 2026 · 15:18 EAT",
    lastUpdate: "19 Aug 2026 · 15:18 EAT",
    source: "onboarding",
    owner: "Growth · Faith W.",
    tenant: "Lavington Pharma",
    shop: "Chemist · Lavington",
    primaryHref: "/admin/vendors",
    primaryLabel: "Open vendors",
    secondaryHref: "/admin/subscriptions",
    secondaryLabel: "View trial",
  },
  {
    id: "an3",
    title: "Subscription paid",
    message: "Njoroge Mini Mart renewed for KES 3,000 via M-Pesa.",
    type: "SUBSCRIPTION",
    priority: "NORMAL",
    read: false,
    time: "3h ago",
    domain: "subscriptions",
    domainLabel: "Subscriptions",
    day: "today",
    clock: "13:12 EAT",
    occurredAt: "19 Aug 2026 · 13:12 EAT",
    receivedDetail: "Received · 13:12:41 · Latency 1.0s",
    firstSeen: "19 Aug 2026 · 13:12 EAT",
    lastUpdate: "19 Aug 2026 · 13:12 EAT",
    source: "daraja_c2b",
    owner: "Billing · Auto",
    tenant: "Njoroge Mini Mart",
    shop: "Duka · Kasarani",
    primaryHref: "/admin/subscriptions",
    primaryLabel: "Open subscriptions",
    secondaryHref: "/admin/tenants/t1",
    secondaryLabel: "View tenant",
  },
  {
    id: "an4",
    title: "Admin AI briefing ready",
    message: "3 at-risk vendors and 3 unclaimed payments need a call today.",
    type: "SYSTEM",
    priority: "HIGH",
    read: false,
    time: "3h ago",
    domain: "ai",
    domainLabel: "Admin AI",
    day: "today",
    clock: "13:08 EAT",
    occurredAt: "19 Aug 2026 · 13:08 EAT",
    receivedDetail: "Received · 13:08:22 · Latency 4.6s",
    firstSeen: "19 Aug 2026 · 13:08 EAT",
    lastUpdate: "19 Aug 2026 · 13:08 EAT",
    source: "admin_ai_runs",
    owner: "Copilot",
    tenant: "Platform",
    shop: "Command centre",
    primaryHref: "/admin/ai",
    primaryLabel: "Open copilot",
    secondaryHref: "/admin/unclaimed",
    secondaryLabel: "Unclaimed queue",
  },
  {
    id: "an5",
    title: "STK failure cluster",
    message: "8 failed STK prompts at Mama Oliech Eatery in 20 minutes.",
    type: "SYSTEM",
    priority: "HIGH",
    read: false,
    time: "4h ago",
    domain: "webhooks",
    domainLabel: "Webhooks",
    day: "today",
    clock: "12:05 EAT",
    occurredAt: "19 Aug 2026 · 12:05 EAT",
    receivedDetail: "Received · 12:05:11 · Latency 0.8s",
    firstSeen: "19 Aug 2026 · 11:47 EAT",
    lastUpdate: "19 Aug 2026 · 12:05 EAT",
    source: "daraja_stk",
    owner: "Ops · Zack K.",
    tenant: "Mama Oliech Eatery",
    shop: "Eatery · Kilimani",
    primaryHref: "/admin/health",
    primaryLabel: "Open health",
    secondaryHref: "/admin/tenants/t5",
    secondaryLabel: "View tenant",
  },
  {
    id: "an6",
    title: "Unclaimed payment — INV-90108",
    message: "KES 3,000 from 254701998221 has a corrupted tenant reference.",
    type: "SYSTEM",
    priority: "CRITICAL",
    read: false,
    time: "5h ago",
    domain: "unclaimed",
    domainLabel: "Unclaimed",
    day: "today",
    clock: "11:02 EAT",
    occurredAt: "19 Aug 2026 · 11:02 EAT",
    receivedDetail: "Received · 11:02:09 · Latency 1.4s",
    firstSeen: "19 Aug 2026 · 11:02 EAT",
    lastUpdate: "19 Aug 2026 · 11:02 EAT",
    source: "intasend_webhook",
    owner: "Ops · Zack K.",
    tenant: "Unmatched",
    shop: "Till unknown",
    primaryHref: "/admin/unclaimed",
    primaryLabel: "Open unclaimed queue",
  },
  {
    id: "an7",
    title: "Webhook failure",
    message: "Njoro Hardware has 3 consecutive failed webhook deliveries.",
    type: "SYSTEM",
    priority: "HIGH",
    read: true,
    time: "Yesterday",
    domain: "webhooks",
    domainLabel: "Webhooks",
    day: "yesterday",
    clock: "18:40 EAT",
    occurredAt: "18 Aug 2026 · 18:40 EAT",
    receivedDetail: "Received · 18:40:02 · Latency 3.8s",
    firstSeen: "18 Aug 2026 · 17:12 EAT",
    lastUpdate: "18 Aug 2026 · 18:40 EAT",
    source: "intasend_webhook",
    owner: "Ops · Zack K.",
    tenant: "Njoro Hardware",
    shop: "Hardware · Kikuyu",
    primaryHref: "/admin/health",
    primaryLabel: "Open health",
    secondaryHref: "/admin/tenants/t4",
    secondaryLabel: "View tenant",
  },
  {
    id: "an8",
    title: "Trial ending",
    message: "Zawadi Boutique's trial ends in 2 days.",
    type: "SUBSCRIPTION",
    priority: "HIGH",
    read: true,
    time: "Yesterday",
    domain: "subscriptions",
    domainLabel: "Subscriptions",
    day: "yesterday",
    clock: "16:20 EAT",
    occurredAt: "18 Aug 2026 · 16:20 EAT",
    receivedDetail: "Received · 16:20:00 · Latency 0.2s",
    firstSeen: "18 Aug 2026 · 16:20 EAT",
    lastUpdate: "18 Aug 2026 · 16:20 EAT",
    source: "trial_cron",
    owner: "Billing · Auto",
    tenant: "Zawadi Boutique",
    shop: "Boutique · Westlands",
    primaryHref: "/admin/subscriptions",
    primaryLabel: "Open subscriptions",
    secondaryHref: "/admin/tenants/t3",
    secondaryLabel: "View tenant",
  },
  {
    id: "an9",
    title: "Broadcast sent",
    message: "WhatsApp debt reminders are now live — sent to all vendors.",
    type: "SYSTEM",
    priority: "LOW",
    read: true,
    time: "Yesterday",
    domain: "comms",
    domainLabel: "Communications",
    day: "yesterday",
    clock: "11:22 EAT",
    occurredAt: "18 Aug 2026 · 11:22 EAT",
    receivedDetail: "Received · 11:22:44 · Latency 0.3s",
    firstSeen: "18 Aug 2026 · 11:22 EAT",
    lastUpdate: "18 Aug 2026 · 11:22 EAT",
    source: "platform_broadcasts",
    owner: "Comms · Zack K.",
    tenant: "All vendors",
    shop: "Platform",
    primaryHref: "/admin/communications",
    primaryLabel: "Open communications",
  },
  {
    id: "an10",
    title: "Vendor suspended",
    message: "Kayole Duka Bora was suspended after a past-due invoice.",
    type: "SYSTEM",
    priority: "CRITICAL",
    read: true,
    time: "Yesterday",
    domain: "vendors",
    domainLabel: "Vendors",
    day: "yesterday",
    clock: "09:14 EAT",
    occurredAt: "18 Aug 2026 · 09:14 EAT",
    receivedDetail: "Received · 09:14:31 · Latency 0.5s",
    firstSeen: "18 Aug 2026 · 09:14 EAT",
    lastUpdate: "18 Aug 2026 · 09:14 EAT",
    source: "billing_guard",
    owner: "Billing · Auto",
    tenant: "Kayole Duka Bora",
    shop: "Duka · Kayole",
    primaryHref: "/admin/vendors",
    primaryLabel: "Open vendors",
    secondaryHref: "/admin/tenants/t6",
    secondaryLabel: "View tenant",
  },
  {
    id: "an11",
    title: "Daraja callback delayed",
    message: "3 webhook retries in the last hour. Delivery still catching up.",
    type: "SYSTEM",
    priority: "NORMAL",
    read: true,
    time: "Yesterday",
    domain: "health",
    domainLabel: "Health",
    day: "yesterday",
    clock: "08:02 EAT",
    occurredAt: "18 Aug 2026 · 08:02 EAT",
    receivedDetail: "Received · 08:02:17 · Latency 1.1s",
    firstSeen: "18 Aug 2026 · 08:02 EAT",
    lastUpdate: "18 Aug 2026 · 08:55 EAT",
    source: "health_probe",
    owner: "SRE · Auto",
    tenant: "Platform",
    shop: "Daraja",
    primaryHref: "/admin/health",
    primaryLabel: "Open health",
  },
];

export const platformHealth = [
  { name: "PostgreSQL", detail: "Connection pool 34 / 100", status: "Healthy", value: 34 },
  { name: "Edge Functions", detail: "p95 latency 214 ms", status: "Healthy", value: 62 },
  { name: "Daraja callbacks", detail: "Demo fixture — not live probe data", status: "Healthy", value: 12 },
  { name: "AI Insights API", detail: "KES 4,120 spend this month", status: "Healthy", value: 41 },
  { name: "Realtime Channels", detail: "128 concurrent sockets", status: "Healthy", value: 28 },
];

export const broadcasts = [
  { id: "b1", message: "Scheduled maintenance on Sunday 02:00 – 03:00 EAT.", audience: "All vendors", status: "Scheduled", sent: "18 Aug" },
  { id: "b2", message: "New feature: email credit reminders are now live.", audience: "All vendors", status: "Sent", sent: "11 Aug" },
  { id: "b3", message: "M-Pesa downtime resolved. Reconciliation caught up.", audience: "Active vendors", status: "Sent", sent: "02 Aug" },
];

export const statusColor: Record<string, string> = {
  Active: "bg-success/15 text-success border-success/30",
  Trial: "bg-warning/20 text-warning-foreground border-warning/40",
  Error: "bg-destructive/15 text-destructive border-destructive/30",
  Suspended: "bg-muted text-muted-foreground border-border",
};
