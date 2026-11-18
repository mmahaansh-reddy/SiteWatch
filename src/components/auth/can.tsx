"use client";

import type { Action, PermissionModule } from "@/domain/permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Renders children only when the current role may perform `action` on `module`.
 * Pass `isOwn` for record-level checks (e.g. an activity assigned to this user).
 *
 *   <Can module="materials" action="approve"><ApproveButton /></Can>
 */
export function Can({
  module,
  action,
  isOwn,
  fallback = null,
  children,
}: {
  module: PermissionModule;
  action: Action;
  isOwn?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const perms = usePermissions();
  if (!hydrated) return null;

  const allowed =
    isOwn === undefined ? perms.can(module, action) : perms.canOnRecord(module, action, isOwn);
  return <>{allowed ? children : fallback}</>;
}
