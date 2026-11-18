"use client";

import * as React from "react";
import {
  Copy,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataReady } from "@/components/common/data-ready";
import { ProgressBar, StatusBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as ops from "@/data/ops";
import { useActor, useData } from "@/data/store";
import {
  DISPLAY_STATUS_LABELS,
  displayStatus,
  slipDays,
  weightedProgress,
  type DisplayStatus,
} from "@/domain/schedule";
import { TRADE_LABELS, type Activity, type Phase } from "@/domain/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate, todayISO } from "@/lib/dates";
import { useSession } from "@/stores/session";

import { ActivityDialog } from "./activity-dialog";
import { CloneFloorDialog, PhaseDialog } from "./phase-dialogs";
import { RemarksDialog } from "./remarks-dialog";

export function ScheduleView() {
  return (
    <DataReady>
      <ScheduleInner />
    </DataReady>
  );
}

type Dialog =
  | { kind: "activity"; activity: Activity | null; phaseId: string }
  | { kind: "remarks"; activity: Activity }
  | { kind: "delete-activity"; activity: Activity }
  | { kind: "phase"; phase: Phase | null }
  | { kind: "delete-phase"; phase: Phase }
  | { kind: "clone" }
  | null;

function ScheduleInner() {
  const projectId = useSession((s) => s.currentProjectId);
  const actor = useActor();
  const { can, canOnRecord, scope } = usePermissions();
  const run = useData((s) => s.run);
  const phases = useData((s) => s.phases);
  const vendors = useData((s) => s.vendors);
  const remarks = useData((s) => s.remarks);
  const allActivities = useData((s) => s.activities);
  const today = todayISO();

  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [phaseFilter, setPhaseFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DisplayStatus | "">("");
  const [vendorFilter, setVendorFilter] = React.useState("");
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(
    () =>
      allActivities.filter(
        (a) =>
          a.projectId === projectId &&
          canOnRecord("schedule", "view", ops.isOwnActivity(actor, a)),
      ),
    // actor is rebuilt each render; its id/role are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allActivities, projectId, actor.id, actor.role, canOnRecord],
  );

  const filtered = visible.filter((a) => {
    if (phaseFilter && a.phaseId !== phaseFilter) return false;
    if (vendorFilter && a.vendorId !== vendorFilter) return false;
    if (statusFilter && displayStatus(a, today) !== statusFilter) return false;
    if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const projectPhases = phases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order);
  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name ?? "—";
  const remarkCount = (id: string) => remarks.filter((r) => r.activityId === id).length;
  const delayedCount = visible.filter((a) => displayStatus(a, today) === "delayed").length;
  const completedCount = visible.filter((a) => a.status === "completed").length;

  const canCreate = can("schedule", "create");
  const canDelete = can("schedule", "delete");
  const ownOnly = scope("schedule", "view") === "own";
  const defaultPhaseId = phaseFilter || projectPhases[0]?.id || "";

  return (
    <>
      <PageHeader
        title="Activities"
        description={
          ownOnly
            ? "Activities assigned to you. Update dates and progress, and log remarks."
            : "Phases, activities, progress and remarks for the approved programme."
        }
        actions={
          canCreate ? (
            <>
              <Button variant="outline" onClick={() => setDialog({ kind: "clone" })}>
                <Copy aria-hidden /> Copy floor
              </Button>
              <Button variant="outline" onClick={() => setDialog({ kind: "phase", phase: null })}>
                <Plus aria-hidden /> Phase
              </Button>
              <Button
                onClick={() => setDialog({ kind: "activity", activity: null, phaseId: defaultPhaseId })}
                disabled={projectPhases.length === 0}
              >
                <Plus aria-hidden /> Activity
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Activities" value={visible.length} />
        <Stat label="Overall complete" value={`${weightedProgress(visible)}%`} />
        <Stat label="Completed" value={completedCount} />
        <Stat label="Delayed" value={delayedCount} tone={delayedCount > 0 ? "bad" : undefined} />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
          <Input
            placeholder="Search activities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Search activities"
          />
        </div>
        <NativeSelect value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} aria-label="Filter by phase">
          <option value="">All phases</option>
          {projectPhases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DisplayStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {(Object.keys(DISPLAY_STATUS_LABELS) as DisplayStatus[]).map((s) => (
            <option key={s} value={s}>
              {DISPLAY_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} aria-label="Filter by vendor">
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {projectPhases.length === 0 ? (
        <EmptyState
          text="No phases yet."
          action={canCreate ? () => setDialog({ kind: "phase", phase: null }) : undefined}
          actionLabel="Add the first phase"
        />
      ) : (
        <div className="space-y-4">
          {projectPhases
            .filter((p) => !phaseFilter || p.id === phaseFilter)
            .map((phase) => {
              const rows = filtered.filter((a) => a.phaseId === phase.id).sort((a, b) => a.order - b.order);
              const phaseAll = visible.filter((a) => a.phaseId === phase.id);
              if (rows.length === 0 && (ownOnly || query || statusFilter || vendorFilter)) return null;
              return (
                <Card key={phase.id} className="gap-0 py-0">
                  <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                    <h2 className="font-semibold">{phase.name}</h2>
                    <Badge variant="outline">{phaseAll.length} activities</Badge>
                    <ProgressBar value={weightedProgress(phaseAll)} />
                    <div className="ml-auto flex items-center gap-1">
                      {canCreate ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDialog({ kind: "activity", activity: null, phaseId: phase.id })}
                        >
                          <Plus aria-hidden /> Add
                        </Button>
                      ) : null}
                      {can("schedule", "edit") && canCreate ? (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`${phase.name} options`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDialog({ kind: "phase", phase })}>
                              <Pencil /> Rename phase
                            </DropdownMenuItem>
                            {canDelete ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDialog({ kind: "delete-phase", phase })}
                              >
                                <Trash2 /> Delete phase
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-6 text-sm">No activities in this phase.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Activity</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Planned</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Slip</TableHead>
                          <TableHead className="pr-4 text-right">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((a) => {
                          const status = displayStatus(a, today);
                          const slip = slipDays(a, today);
                          const own = ops.isOwnActivity(actor, a);
                          const editable = canOnRecord("schedule", "edit", own);
                          const notes = remarkCount(a.id);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="max-w-[320px] pl-4 whitespace-normal">
                                <div className="font-medium">{a.name}</div>
                                <div className="text-muted-foreground text-xs">{TRADE_LABELS[a.trade]}</div>
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate">{vendorName(a.vendorId)}</TableCell>
                              <TableCell className="tabular-nums">
                                {formatDate(a.plannedStart)} → {formatDate(a.plannedEnd)}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {a.actualStart ? `${formatDate(a.actualStart)} → ${formatDate(a.actualEnd)}` : "—"}
                              </TableCell>
                              <TableCell>
                                <ProgressBar value={a.progress} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={status} />
                              </TableCell>
                              <TableCell
                                className={`text-right tabular-nums ${slip > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}
                              >
                                {slip > 0 ? `+${slip}d` : slip < 0 ? `${slip}d` : "0"}
                              </TableCell>
                              <TableCell className="pr-4">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDialog({ kind: "remarks", activity: a })}
                                    aria-label={`Remarks for ${a.name}`}
                                  >
                                    <MessageSquare aria-hidden />
                                    {notes > 0 ? <span className="tabular-nums">{notes}</span> : null}
                                  </Button>
                                  {editable && !canCreate ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setDialog({ kind: "activity", activity: a, phaseId: a.phaseId })}
                                    >
                                      <TrendingUp aria-hidden /> Update
                                    </Button>
                                  ) : null}
                                  {canCreate ? (
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" aria-label={`Options for ${a.name}`}>
                                          <MoreHorizontal />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onSelect={() => setDialog({ kind: "activity", activity: a, phaseId: a.phaseId })}
                                        >
                                          <Pencil /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setDialog({ kind: "remarks", activity: a })}>
                                          <MessageSquare /> Remarks
                                        </DropdownMenuItem>
                                        {canDelete ? (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              variant="destructive"
                                              onSelect={() => setDialog({ kind: "delete-activity", activity: a })}
                                            >
                                              <Trash2 /> Delete
                                            </DropdownMenuItem>
                                          </>
                                        ) : null}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              );
            })}
          {filtered.length === 0 && visible.length > 0 ? (
            <p className="text-muted-foreground text-center text-sm">No activities match these filters.</p>
          ) : null}
          {visible.length === 0 && ownOnly ? (
            <EmptyState text="No activities are assigned to you yet." />
          ) : null}
        </div>
      )}

      <ActivityDialog
        open={dialog?.kind === "activity"}
        onOpenChange={(o) => !o && setDialog(null)}
        activity={dialog?.kind === "activity" ? dialog.activity : null}
        projectId={projectId}
        defaultPhaseId={dialog?.kind === "activity" ? dialog.phaseId : defaultPhaseId}
      />
      <RemarksDialog
        activity={dialog?.kind === "remarks" ? dialog.activity : null}
        onOpenChange={(o) => !o && setDialog(null)}
      />
      <PhaseDialog
        open={dialog?.kind === "phase"}
        onOpenChange={(o) => !o && setDialog(null)}
        phase={dialog?.kind === "phase" ? dialog.phase : null}
        projectId={projectId}
      />
      <CloneFloorDialog open={dialog?.kind === "clone"} onOpenChange={(o) => !o && setDialog(null)} projectId={projectId} />
      <ConfirmDialog
        open={dialog?.kind === "delete-activity"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Delete activity?"
        description={
          dialog?.kind === "delete-activity"
            ? `"${dialog.activity.name}" and its remarks will be removed. This is recorded in the audit log.`
            : ""
        }
        onConfirm={() =>
          dialog?.kind === "delete-activity"
            ? run((s, a) => ops.deleteActivity(s, a, dialog.activity.id))
            : { ok: true }
        }
      />
      <ConfirmDialog
        open={dialog?.kind === "delete-phase"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Delete phase?"
        description={dialog?.kind === "delete-phase" ? `Delete "${dialog.phase.name}"? It must have no activities.` : ""}
        onConfirm={() =>
          dialog?.kind === "delete-phase" ? run((s, a) => ops.deletePhase(s, a, dialog.phase.id)) : { ok: true }
        }
      />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "bad" }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text, action, actionLabel }: { text: string; action?: () => void; actionLabel?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-muted-foreground text-sm">{text}</p>
        {action && actionLabel ? (
          <Button onClick={action}>
            <Plus aria-hidden /> {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
