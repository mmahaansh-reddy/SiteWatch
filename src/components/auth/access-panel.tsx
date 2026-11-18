"use client";

import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ACTION_LABELS,
  ROLE_LABELS,
  type Action,
  type PermissionModule,
} from "@/domain/permissions";
import { usePermissions } from "@/hooks/use-permissions";

/** "What can I do here?" — the current role's rights on a module. */
export function AccessPanel({ module }: { module: PermissionModule }) {
  const { role, grant, summary } = usePermissions();
  const entries = Object.entries(grant(module)).filter(([, scope]) => scope) as [
    Action,
    "all" | "own",
  ][];

  return (
    <Card className="gap-3 py-4">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ShieldCheck className="text-primary size-4" aria-hidden />
          <span className="font-medium">Your access as {ROLE_LABELS[role]}:</span>
          <span className="text-muted-foreground">{summary(module)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map(([action, scope]) => (
            <Badge key={action} variant={action === "view" ? "outline" : "secondary"}>
              {ACTION_LABELS[action]}
              {scope === "own" ? " · own only" : ""}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
