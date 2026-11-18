"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Gauge, TrendingDown, Wallet } from "lucide-react";

import { DataTools } from "@/components/admin/data-tools";
import { DataReady } from "@/components/common/data-ready";
import { ProgressBar } from "@/components/common/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/data/store";
import { displayStatus, projectedFinish, slipDays, weightedProgress } from "@/domain/schedule";
import { diffDays, formatDate, todayISO } from "@/lib/dates";
import { useSession } from "@/stores/session";

export function DashboardView() {
  return (
    <DataReady>
      <DashboardInner />
    </DataReady>
  );
}

function DashboardInner() {
  const projectId = useSession((s) => s.currentProjectId);
  const projects = useData((s) => s.projects);
  const allPhases = useData((s) => s.phases);
  const allActivities = useData((s) => s.activities);
  const vendors = useData((s) => s.vendors);
  const today = todayISO();

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const activities = allActivities.filter((a) => a.projectId === project?.id);
  const phases = allPhases.filter((p) => p.projectId === project?.id).sort((a, b) => a.order - b.order);

  const overall = weightedProgress(activities);
  const finish = projectedFinish(activities, today);
  const behind = project && finish ? diffDays(project.baselineEnd, finish) : 0;
  const threshold = project?.settings.criticalDelayDays ?? 3;
  const critical = activities
    .filter((a) => a.status !== "completed" && a.status !== "on_hold")
    .map((a) => ({ a, slip: slipDays(a, today) }))
    .filter((x) => x.slip > threshold)
    .sort((x, y) => y.slip - x.slip);
  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name ?? "Unassigned";

  const kpis = [
    { label: "Overall completion", icon: Gauge, value: `${overall}%`, hint: "Weighted by activity duration" },
    {
      label: "Schedule",
      icon: TrendingDown,
      value: behind > 0 ? `${behind}d behind` : behind < 0 ? `${-behind}d ahead` : "On track",
      hint: finish ? `Projected handover ${formatDate(finish)}` : "No activities yet",
      tone: behind > 0 ? "bad" : undefined,
    },
    { label: "Budget utilised", icon: Wallet, value: "—", hint: "Arrives with Budget & BOQ (T9)" },
    { label: "Pending approvals", icon: ClipboardCheck, value: "—", hint: "Arrives with indents & invoices" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={project ? `${project.name} · ${project.location}` : "No project"}
        actions={
          project ? (
            <Badge variant="outline">
              Baseline: {formatDate(project.baselineStart)} → {formatDate(project.baselineEnd)}
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="gap-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardDescription>{k.label}</CardDescription>
                <Icon className="text-muted-foreground size-4" aria-hidden />
              </CardHeader>
              <CardContent className="space-y-1">
                <p
                  className={`text-3xl font-semibold tabular-nums ${"tone" in k && k.tone === "bad" ? "text-destructive" : ""}`}
                >
                  {k.value}
                </p>
                <p className="text-muted-foreground text-xs">{k.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Phase-wise progress</CardTitle>
            <CardDescription>Live from the activity list.</CardDescription>
          </CardHeader>
          <CardContent>
            {phases.length === 0 ? (
              <p className="text-muted-foreground text-sm">No phases yet.</p>
            ) : (
              <ul className="divide-y">
                {phases.map((phase) => {
                  const rows = activities.filter((a) => a.phaseId === phase.id);
                  const delayed = rows.filter((a) => displayStatus(a, today) === "delayed").length;
                  const starts = rows.map((a) => a.plannedStart).sort();
                  const ends = rows.map((a) => a.plannedEnd).sort();
                  return (
                    <li key={phase.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                      <span className="w-40 font-medium">{phase.name}</span>
                      <ProgressBar value={weightedProgress(rows)} />
                      <span className="text-muted-foreground tabular-nums">
                        {starts[0] ? `${formatDate(starts[0])} → ${formatDate(ends.at(-1))}` : "—"}
                      </span>
                      {delayed > 0 ? <Badge variant="destructive">{delayed} delayed</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4" aria-hidden /> Critical delays
            </CardTitle>
            <CardDescription>Open activities projected more than {threshold} days late (FR-6.3).</CardDescription>
          </CardHeader>
          <CardContent>
            {critical.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing beyond the threshold. 🎉</p>
            ) : (
              <ul className="divide-y text-sm">
                {critical.slice(0, 8).map(({ a, slip }) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {vendorName(a.vendorId)} · due {formatDate(a.plannedEnd)}
                      </p>
                    </div>
                    <span className="text-destructive font-medium tabular-nums">+{slip}d</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="link" className="mt-2 px-0">
              <Link href="/schedule">Open activities →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <DataTools />
      </div>
    </>
  );
}
