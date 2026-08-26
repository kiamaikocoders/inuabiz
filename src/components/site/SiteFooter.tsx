import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            InuaBiz — "Lift Your Business". A mobile-first till for Kenyan dukas, boutiques,
            chemists and eateries. From KES 3,000 per shop / month — Compliance and enterprise on
            the pricing page.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Nairobi, Kenya · hello@inuabiz.co.ke</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Product</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/karibu" className="hover:text-foreground">
                Karibu
              </Link>
            </li>
            <li>
              <Link to="/for-dukas" className="hover:text-foreground">
                For dukas
              </Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/signup" className="hover:text-foreground">
                Start free trial
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} InuaBiz. All rights reserved.</p>
          <p>Customer payments and billing run on M-Pesa</p>
        </div>
      </div>
    </footer>
  );
}
