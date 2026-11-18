"use client";

import * as React from "react";
import Link from "next/link";
import { HardHat, Menu } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ProjectSwitcher, UserSwitcher } from "@/components/layout/switchers";
import { ThemeToggle } from "@/components/layout/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SITE_VIEW } from "@/lib/nav";

/** Dashboard shell: fixed sidebar on desktop, slide-out sheet on mobile. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href={SITE_VIEW.href}>
              <HardHat aria-hidden />
              {SITE_VIEW.label}
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-72 gap-0 p-0">
              <SheetHeader className="border-b">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <ProjectSwitcher />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
