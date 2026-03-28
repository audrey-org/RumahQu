import { ClipboardList, Home, Plus, UserRound, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup } from "@/contexts/GroupContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/AddItemDialog";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/inventory",
    label: "Stok",
    icon: ClipboardList,
    isActive: (pathname: string) => pathname.startsWith("/inventory"),
  },
  {
    href: "/groups",
    label: "Grup",
    icon: Users,
    isActive: (pathname: string) => pathname.startsWith("/groups"),
  },
  {
    href: "/profile",
    label: "Profil",
    icon: UserRound,
    isActive: (pathname: string) => pathname.startsWith("/profile"),
  },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const { activeGroup, pendingInvites } = useGroup();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!user || !isMobile || location.pathname === "/auth") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="pointer-events-auto mx-auto max-w-md rounded-[30px] border border-border/60 bg-background/95 px-3 pb-3 pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end gap-1">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = item.isActive(location.pathname);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="flex justify-center">
            <AddItemDialog
              onAdded={() => {}}
              groupId={activeGroup?.id}
              trigger={
                <button
                  type="button"
                  className="flex h-16 w-16 -translate-y-5 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_32px_rgba(14,165,233,0.35)] transition-transform active:scale-95"
                  aria-label="Tambah barang"
                >
                  <Plus className="h-6 w-6" />
                </button>
              }
            />
          </div>

          {navItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active = item.isActive(location.pathname);
            const showBadge = item.href === "/groups" && pendingInvites.length > 0;

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {pendingInvites.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
