"use client";

import { useMemo } from "react";

import {
  can,
  canOnRecord,
  grantFor,
  scopeFor,
  summaryFor,
  type Action,
  type PermissionModule,
} from "@/domain/permissions";
import { useCurrentUser } from "@/stores/session";

/** Permission helpers bound to the current user. */
export function usePermissions() {
  const user = useCurrentUser();

  return useMemo(
    () => ({
      user,
      role: user.role,
      can: (module: PermissionModule, action: Action) => can(user.role, module, action),
      canOnRecord: (module: PermissionModule, action: Action, isOwn: boolean) =>
        canOnRecord(user.role, module, action, isOwn),
      scope: (module: PermissionModule, action: Action) => scopeFor(user.role, module, action),
      grant: (module: PermissionModule) => grantFor(user.role, module),
      summary: (module: PermissionModule) => summaryFor(user.role, module),
    }),
    [user],
  );
}
