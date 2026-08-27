import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { invokePublicFunction, isSupabaseConfigured } from "@/lib/supabase";

const legalLinks = [
  { to: "/privacy" as const, label: "Privacy Policy" },
  { to: "/terms" as const, label: "Terms of Service" },
  { to: "/contact" as const, label: "Contact" },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!isSupabaseConfigured()) {
      toast.error("Newsletter is not connected yet");
      return;
    }
    setBusy(true);
    const { data, error } = await invokePublicFunction<{ ok?: boolean }>("subscribe-newsletter", {
      email: trimmed,
      source: "footer",
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Could not subscribe", { description: error ?? "Try again in a moment." });
      return;
    }
    toast.success("You're on the list", { description: "Check your inbox for a confirmation." });
    setEmail("");
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="flex w-full flex-col gap-10 px-8 py-14 sm:px-12 lg:flex-row lg:items-start lg:justify-between lg:gap-8 xl:px-20">
        <div className="min-w-0 lg:max-w-xs">
          <Link to="/" aria-label="InuaBiz home">
            <Logo />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A mobile-first till for Kenyan dukas, boutiques, chemists and eateries.
          </p>
        </div>

        <div className="min-w-0 shrink-0">
          <h3 className="font-display text-sm font-bold text-foreground">Quick Links</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link to="/pricing" hash="faq" className="hover:text-foreground">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
          </ul>
        </div>

        <div className="min-w-0 shrink-0">
          <h3 className="font-display text-sm font-bold text-foreground">Legal</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {legalLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 w-full max-w-sm lg:max-w-xs">
          <h3 className="font-display text-sm font-bold text-foreground">Newsletter</h3>
          <p className="mt-4 text-sm text-muted-foreground">Till news in your inbox.</p>
          <form className="mt-4" onSubmit={(e) => void subscribe(e)}>
            <label htmlFor="footer-newsletter" className="sr-only">
              Email address
            </label>
            <div className="flex items-center rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
              <input
                id="footer-newsletter"
                type="email"
                required
                autoComplete="email"
                placeholder="Your email address"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy}
                className="m-1 shrink-0 rounded-md bg-gold px-3.5 py-1.5 text-sm font-semibold text-gold-foreground transition-colors hover:bg-gold/90 disabled:opacity-60"
              >
                {busy ? "…" : "Subscribe"}
              </button>
            </div>
          </form>
          <p className="mt-5 text-xs text-muted-foreground">© {year} InuaBiz</p>
        </div>
      </div>
    </footer>
  );
}
