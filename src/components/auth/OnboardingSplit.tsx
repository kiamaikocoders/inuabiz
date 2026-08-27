import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ScenePane } from "@/components/auth/ScenePane";
import { AuthLegalLinks } from "@/components/auth/AuthLegal";
import { ONBOARDING_STEPS } from "@/lib/auth-scenes";
import { cn } from "@/lib/utils";

export function OnboardingSplit({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  const scene = ONBOARDING_STEPS[Math.min(Math.max(step, 0), ONBOARDING_STEPS.length - 1)]!;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <ScenePane
        image={scene.image}
        imageAlt={scene.imageAlt}
        className="hidden min-h-screen p-10 lg:flex lg:flex-col lg:justify-between"
      >
        <div>
          <Link to="/" className="w-fit">
            <Logo tone="inverted" />
          </Link>
          <p className="text-gold mt-10 text-xs font-semibold tracking-[0.18em]">SET UP YOUR SHOP</p>
          <h2 className="text-primary-foreground mt-3 max-w-sm text-3xl font-bold leading-tight">
            Five minutes. Then the till is live.
          </h2>
          <ol className="mt-10 space-y-4" aria-label="Onboarding steps">
            {ONBOARDING_STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                      current && "bg-gold text-gold-foreground",
                      done && "bg-primary-foreground/20 text-primary-foreground",
                      !done && !current && "border border-primary-foreground/30 text-primary-foreground/45",
                    )}
                    aria-current={current ? "step" : undefined}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      current ? "text-primary-foreground" : "text-primary-foreground/55",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-primary-foreground/60 max-w-sm text-xs leading-relaxed">{scene.caption}</p>
      </ScenePane>

      <div className="flex min-h-screen flex-col bg-background">
        <ScenePane image={scene.image} imageAlt={scene.imageAlt} className="h-36 p-5 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <Link to="/" className="w-fit">
              <Logo tone="inverted" />
            </Link>
            <Link to="/login" className="text-primary-foreground/80 text-sm hover:text-primary-foreground">
              Sign in
            </Link>
          </div>
          <p className="text-primary-foreground mt-auto text-xs font-semibold">
            {step + 1} of {ONBOARDING_STEPS.length} · {scene.label}
          </p>
        </ScenePane>

        <div className="hidden items-center justify-end px-8 pt-6 lg:flex">
          <Link to="/login" className="text-muted-foreground text-sm hover:text-foreground">
            Sign in
          </Link>
        </div>

        <div className="flex flex-1 flex-col px-5 py-8 sm:px-12 lg:justify-center">
          <div className="mx-auto w-full max-w-md">{children}</div>
          <AuthLegalLinks className="mx-auto mt-8 w-full max-w-md" />
        </div>
      </div>
    </div>
  );
}
