"use client";

import Link from "next/link";
import {
  BookOpen,
  Camera,
  FileDiff,
  FileStack,
  ListChecks,
  type LucideIcon,
  PackagePlus,
  ShieldAlert,
  Wallet,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ROLE_LABELS,
  type Action,
  type PermissionModule,
} from "@/domain/permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePermissions } from "@/hooks/use-permissions";
import { firstWebPageFor } from "@/lib/nav";

interface SiteAction {
  label: string;
  icon: LucideIcon;
  module: PermissionModule;
  action: Action;
  /** Plan task that wires the action up. */
  task: string;
}

/** Quick actions for site staff; each appears only if the role is allowed to do it. */
const SITE_ACTIONS: SiteAction[] = [
  { label: "Update progress", icon: ListChecks, module: "schedule", action: "edit", task: "T7" },
  { label: "Take photo", icon: Camera, module: "schedule", action: "edit", task: "T7" },
  { label: "Raise indent", icon: PackagePlus, module: "materials", action: "request", task: "T11" },
  { label: "Log receipt", icon: PackagePlus, module: "materials", action: "log", task: "T11" },
  { label: "Daily diary", icon: BookOpen, module: "diary", action: "create", task: "T12" },
  { label: "Equipment usage", icon: Wrench, module: "equipment", action: "log", task: "T12" },
  { label: "Log defect", icon: ShieldAlert, module: "warranty", action: "log", task: "T15" },
  { label: "Respond to defect", icon: ShieldAlert, module: "warranty", action: "respond", task: "T15" },
  { label: "Request change", icon: FileDiff, module: "change_orders", action: "request", task: "T13" },
];

/** Read-only areas a site role can look at. */
const VIEW_LINKS: { label: string; icon: LucideIcon; module: PermissionModule; href: string }[] = [
  { label: "My payments", icon: Wallet, module: "payments", href: "/payments" },
  { label: "Budget", icon: Wallet, module: "budget", href: "/budget" },
  { label: "Documents", icon: FileStack, module: "documents", href: "/documents" },
];

export function SiteHome() {
  const hydrated = useHydrated();
  const { role, can, scope } = usePermissions();

  if (!hydrated) {
    return <div className="bg-muted h-64 animate-pulse rounded-xl" aria-busy="true" />;
  }

  const actions = SITE_ACTIONS.filter((a) => can(a.module, a.action));
  const views = VIEW_LINKS.filter((v) => can(v.module, "view"));
  const webPage = firstWebPageFor(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today on site</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {ROLE_LABELS[role]}. You only see actions your role can take.
        </p>
      </div>

      {actions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, icon: Icon, task, module, action }) => (
            <button
              key={label}
              type="button"
              disabled
              title={`Coming in ${task}`}
              className="bg-card flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center shadow-sm disabled:opacity-70"
            >
              <Icon className="text-primary size-7" aria-hidden />
              <span className="font-medium">{label}</span>
              <span className="flex flex-wrap justify-center gap-1">
                {scope(module, action) === "own" ? <Badge variant="outline">own only</Badge> : null}
                <Badge variant="secondary">{task}</Badge>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground text-sm">
            Your role has no site actions. Use the web dashboard instead.
          </CardContent>
        </Card>
      )}

      {views.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">View</h2>
          <div className="grid gap-2">
            {views.map(({ label, icon: Icon, href, module }) => (
              <Link
                key={href}
                href={href}
                className="bg-card hover:bg-accent flex min-h-12 items-center gap-3 rounded-lg border px-4 text-sm font-medium"
              >
                <Icon className="text-muted-foreground size-4" aria-hidden />
                {label}
                {scope(module, "view") === "own" ? (
                  <Badge variant="outline" className="ml-auto">
                    own only
                  </Badge>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="text-muted-foreground text-sm">
          {can("schedule", "view")
            ? `${scope("schedule", "view") === "own" ? "Your assigned" : "All"} current and upcoming activities will appear here (FR-1.8, task T7).`
            : "No schedule access."}
          {webPage ? (
            <>
              {" "}
              <Link href={webPage.href} className="text-primary underline-offset-4 hover:underline">
                Open web view
              </Link>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
