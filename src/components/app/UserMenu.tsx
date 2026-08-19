import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings, Sparkles, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearStoredIdentity, initials, roleLabel, type AppIdentity } from "@/lib/identity";
import { signOut } from "@/lib/auth";
import { stopGhost } from "@/lib/ghost";
import { cn } from "@/lib/utils";

export function UserMenu({
  identity,
  kind,
}: {
  identity: AppIdentity;
  kind: "vendor" | "admin";
}) {
  const navigate = useNavigate();
  const letters = initials(identity.fullName);

  const onSignOut = () => {
    stopGhost();
    clearStoredIdentity();
    void signOut()
      .catch(() => undefined)
      .finally(() => {
        toast.success("Signed out");
        void navigate({ to: "/login" });
      });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted flex items-center gap-2 rounded-full py-1 pr-1.5 pl-1 transition-colors"
          aria-label="Open profile menu"
        >
          <span
            className={cn(
              "grid size-9 place-items-center rounded-full text-[11px] font-bold",
              kind === "admin"
                ? "bg-foreground text-background"
                : "bg-primary-soft text-primary",
            )}
          >
            {letters}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-36 truncate text-xs font-semibold leading-tight">
              {identity.fullName}
            </span>
            <span className="text-muted-foreground block truncate text-[10px] leading-tight">
              {roleLabel(identity.role)}
            </span>
          </span>
          <ChevronDown className="text-muted-foreground hidden size-3.5 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{identity.fullName}</p>
          <p className="text-muted-foreground text-xs">{identity.phone}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {kind === "admin" ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin/profile">
                <UserRound /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/settings">
                <Settings /> Platform settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/ai">
                <Sparkles /> Admin AI
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app">
                <Store /> Vendor view
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/app/profile">
                <UserRound /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app/settings">
                <Settings /> Shop settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app/billing">
                <Store /> Subscription
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onSignOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
