import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function AuthSplit({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero-gradient relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="grid-paper absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="relative">
          <Link to="/">
            <Logo tone="inverted" />
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-primary-foreground text-3xl font-bold leading-tight">
            "I stopped losing money to the ledger book."
          </h2>
          <p className="text-primary-foreground/75 mt-4 leading-relaxed">
            Vendors on InuaBiz recover an average of KES 9,400 a month in credit that used to
            disappear between pages.
          </p>
          <p className="text-gold mt-6 text-sm font-semibold">Mama Njoroge · Kasarani</p>
        </div>
        <p className="text-primary-foreground/50 relative text-xs">
          Secured with phone OTP. We never store passwords.
        </p>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
