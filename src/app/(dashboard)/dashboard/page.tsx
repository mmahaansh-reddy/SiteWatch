import type { Metadata } from "next";
import { ClipboardCheck, Gauge, TrendingDown, Wallet } from "lucide-react";

import { RequireAccess } from "@/components/auth/require-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

/** KPI tiles required by FR-6.1. Values are wired to live data in T16. */
const KPIS = [
  { label: "Overall completion", icon: Gauge, hint: "Weighted by activity duration" },
  { label: "Schedule", icon: TrendingDown, hint: "Days ahead / behind baseline" },
  { label: "Budget utilised", icon: Wallet, hint: "Actual spend vs BOQ" },
  { label: "Pending approvals", icon: ClipboardCheck, hint: "Indents, invoices, change orders" },
] as const;

/** Phase windows from PRD Appendix A (baseline programme). */
const PHASES = [
  { name: "Foundation", start: "21-Jun-26", end: "29-Jul-26" },
  { name: "Basement", start: "24-Jul-26", end: "09-Oct-26" },
  { name: "Stilt Floor", start: "19-Sep-26", end: "01-Feb-27" },
  { name: "First Floor", start: "16-Nov-26", end: "15-Mar-27" },
  { name: "Second Floor", start: "16-Dec-26", end: "27-Apr-27" },
  { name: "Third Floor", start: "28-Jan-27", end: "09-Jun-27" },
  { name: "Fourth Floor", start: "12-Mar-27", end: "22-Jul-27" },
  { name: "Terrace & External", start: "24-Apr-27", end: "24-Aug-27" },
  { name: "Finishing & Handover", start: "05-Jul-27", end: "30-Sep-27" },
] as const;

export default function DashboardPage() {
  return (
    <RequireAccess module="dashboard">
      <PageHeader
        title="Dashboard"
        description="Foxsense Commercial Building · Vellanaipatti Road, Coimbatore"
        actions={<Badge variant="outline">Baseline: 21-Jun-26 → 30-Sep-27</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map(({ label, icon: Icon, hint }) => (
          <Card key={label} className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardDescription>{label}</CardDescription>
              <Icon className="text-muted-foreground size-4" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tabular-nums">—</p>
              <p className="text-muted-foreground text-xs">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Phase windows (baseline)</CardTitle>
          <CardDescription>
            From the approved programme. Live progress per phase arrives with the schedule module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {PHASES.map((phase) => (
              <li key={phase.name} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="font-medium">{phase.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {phase.start} → {phase.end}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </RequireAccess>
  );
}
