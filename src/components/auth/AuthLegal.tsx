import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function LegalDocLink({ to, children }: { to: "/terms" | "/privacy"; children: string }) {
  return (
    <Link
      to={to}
      target="_blank"
      rel="noreferrer"
      className="text-foreground font-medium underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

export function AuthLegalLinks({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-center text-xs leading-relaxed", className)}>
      <LegalDocLink to="/terms">Terms of Service</LegalDocLink>
      {" · "}
      <LegalDocLink to="/privacy">Privacy Policy</LegalDocLink>
    </p>
  );
}

export function AuthLegalConsent({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="legal-consent"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-required
      />
      <Label htmlFor="legal-consent" className="text-muted-foreground text-sm leading-relaxed font-normal">
        I agree to the <LegalDocLink to="/terms">Terms of Service</LegalDocLink> and{" "}
        <LegalDocLink to="/privacy">Privacy Policy</LegalDocLink>.
      </Label>
    </div>
  );
}
