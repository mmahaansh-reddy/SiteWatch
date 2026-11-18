"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useHydrated } from "@/hooks/use-hydrated";
import { navForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/stores/session";

/** Navigation list shared by the desktop sidebar and the mobile sheet, filtered by role. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useCurrentUser();

  if (!hydrated) {
    return (
      <div className="space-y-2 px-3 py-4" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bg-muted h-8 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {navForRole(user.role).map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
