"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { firstWebPageFor } from "@/lib/nav";
import { useCurrentUser } from "@/stores/session";

/** Opens the first web page the current role may see (dashboard for PM/Admin). */
export function WebViewButton() {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const page = hydrated ? firstWebPageFor(user.role) : undefined;
  if (!page) return null;

  return (
    <Button asChild variant="ghost" size="icon" aria-label={`Open ${page.label}`}>
      <Link href={page.href}>
        <LayoutDashboard />
      </Link>
    </Button>
  );
}
