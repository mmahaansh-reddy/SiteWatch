import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { UserSwitcher } from "@/components/layout/switchers";
import { ThemeToggle } from "@/components/layout/theme";
import { Button } from "@/components/ui/button";

/** Mobile-first layout for Site Engineers and Contractors (PRD §2.2, NFR-7). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col">
      <header className="bg-background sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3">
        <Brand href="/site" />
        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Open dashboard">
            <Link href="/dashboard">
              <LayoutDashboard />
            </Link>
          </Button>
          <ThemeToggle />
          <UserSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 p-4">{children}</main>
    </div>
  );
}
