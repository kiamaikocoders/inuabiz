export type AuthScene = {
  image: string;
  imageAlt: string;
  quote: string;
  body: string;
  byline: string;
  caption: string;
};

export const AUTH_SCENES = {
  login: {
    image: "/images/auth/login-chemist.jpg",
    imageAlt: "Chemist counter at midday, shelves of packaged goods behind the till",
    quote: "I stopped losing money to the ledger book.",
    body: "Vendors on InuaBiz recover an average of KES 9,400 a month in credit that used to disappear between pages.",
    byline: "Duka owner · Nairobi",
    caption: "Secured with email verification. Extra shops are paid on M-Pesa before they go live.",
  },
  signup: {
    image: "/images/auth/signup-market.jpg",
    imageAlt: "Mama mboga stall in the morning, produce stacked on a wooden table",
    quote: "The till that keeps up when the shop is full.",
    body: "Open an account, verify your email, then finish shop setup. Your first shop starts a 3-day trial.",
    byline: "Wanjiku · Githurai",
    caption: "One shop, one till. Category shapes inventory, receipts and extra screens.",
  },
  verify: {
    image: "/images/auth/verify-repair.jpg",
    imageAlt: "Electronics repair bench at night, tools and boards under a work lamp",
    quote: "One code. Then your shop is yours.",
    body: "We confirm the email so only you can open this till. The code expires in a few minutes.",
    byline: "Otieno · Kisumu",
    caption: "Never share the code. InuaBiz staff will not ask for it.",
  },
} as const satisfies Record<string, AuthScene>;

export const ONBOARDING_STEPS = [
  {
    id: "phone",
    label: "Phone",
    image: "/images/onboarding/phone-kiosk.jpg",
    imageAlt: "Phone kiosk at dusk, SIM cards and handsets under a shop awning",
    caption: "This number is where subscription STK prompts and trial alerts land.",
  },
  {
    id: "shop",
    label: "Shop",
    image: "/images/onboarding/shop-duka.jpg",
    imageAlt: "Neighbourhood duka in the morning, crates and hanging goods at the doorway",
    caption: "Category shapes the till, inventory fields and extra screens for this shop.",
  },
  {
    id: "photo",
    label: "Photo",
    image: "/images/about-options/about-a-intro-new-duka.png",
    imageAlt: "Newly painted neighbourhood duka in morning light, shutter half open at the doorway",
    caption: "A shop photo is optional — skip it now and add one later in Settings.",
  },
  {
    id: "pay",
    label: "Pay",
    image: "/images/onboarding/pay-boutique.jpg",
    imageAlt: "Clothing boutique in the evening, garments on racks beside the counter",
    caption: "Add every Till, Paybill or personal number you already use — pick one as primary.",
  },
  {
    id: "plan",
    label: "Plan",
    image: "/images/features-options/feat-photo-subscription-night.png",
    imageAlt: "Shop counter at night with a phone showing a subscription payment prompt",
    caption: "Standard is the default. Pick Compliance for ETR-format receipts for your KRA filing pack.",
  },
] as const;
