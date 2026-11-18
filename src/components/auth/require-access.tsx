"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MODULE_LABELS, ROLE_LABELS, homeFor, type PermissionModule } from "@/domain/permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePermissions } from "@/hooks/use-permissions";

/** Page guard: renders children only if the current role may view the module. */
export function RequireAccess({
  module,
  children,
}: {
  module: PermissionModule;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const { can, role } = usePermissions();

  if (!hydrated) return <PageSkeleton />;
  if (!can(module, "view")) return <NoAccess module={module} role={role} />;
  return <>{children}</>;
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
      <div className="bg-muted h-40 animate-pulse rounded-xl" />
    </div>
  );
}

function NoAccess({ module, role }: { module: PermissionModule; role: keyof typeof ROLE_LABELS }) {
  return (
    <Card className="mx-auto mt-10 max-w-md border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Lock className="text-muted-foreground size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-medium">No access to {MODULE_LABELS[module]}</p>
          <p className="text-muted-foreground text-sm">
            The {ROLE_LABELS[role]} role can&apos;t open this page.
          </p>
        </div>
        <Button asChild>
          <Link href={homeFor(role)}>Go to my home page</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
