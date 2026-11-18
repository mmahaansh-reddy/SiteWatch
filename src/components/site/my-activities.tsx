"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, MessageSquare } from "lucide-react";

import { DataReady } from "@/components/common/data-ready";
import { ProgressBar, StatusBadge } from "@/components/common/status-badge";
import { ActivityDialog } from "@/components/schedule/activity-dialog";
import { RemarksDialog } from "@/components/schedule/remarks-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import * as ops from "@/data/ops";
import { useActor, useData } from "@/data/store";
import { displayStatus } from "@/domain/schedule";
import type { Activity } from "@/domain/types";
import { usePermissions } from "@/hooks/use-permissions";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { useSession } from "@/stores/session";

const LOOKAHEAD_DAYS = 14;

/** FR-1.8: current and upcoming activities within the user's own scope, big tap targets. */
export function MyActivities() {
  return (
    <DataReady>
      <MyActivitiesInner />
    </DataReady>
  );
}

function MyActivitiesInner() {
  const projectId = useSession((s) => s.currentProjectId);
  const actor = useActor();
  const { canOnRecord, scope } = usePermissions();
  const activities = useData((s) => s.activities);
  const vendors = useData((s) => s.vendors);
  const [editing, setEditing] = React.useState<Activity | null>(null);
  const [remarksFor, setRemarksFor] = React.useState<Activity | null>(null);
  const today = todayISO();
  const horizon = addDays(today, LOOKAHEAD_DAYS);

  const mine = activities
    .filter((a) => a.projectId === projectId)
    .filter((a) => canOnRecord("schedule", "view", ops.isOwnActivity(actor, a)))
    .filter((a) => a.status !== "completed" && a.plannedStart <= horizon)
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));

  const current = mine.filter((a) => a.actualStart || a.plannedStart <= today);
  const upcoming = mine.filter((a) => !(a.actualStart || a.plannedStart <= today));
  const ownOnly = scope("schedule", "view") === "own";

  if (!canOnRecord("schedule", "view", true)) return null;

  const renderList = (rows: Activity[]) =>
    rows.map((a) => {
      const editable = canOnRecord("schedule", "edit", ops.isOwnActivity(actor, a));
      return (
        <Card key={a.id} className="gap-3 py-4">
          <CardContent className="space-y-3">
            <button
              type="button"
              className="flex w-full items-start gap-3 text-left disabled:cursor-default"
              onClick={() => setEditing(a)}
              disabled={!editable}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(a.plannedStart)} → {formatDate(a.plannedEnd)} ·{" "}
                  {vendors.find((v) => v.id === a.vendorId)?.name ?? "No vendor"}
                </p>
              </div>
              {editable ? <ChevronRight className="text-muted-foreground mt-1 size-5 shrink-0" aria-hidden /> : null}
            </button>
            <div className="flex items-center justify-between gap-2">
              <ProgressBar value={a.progress} className="flex items-center gap-2 [&>div]:w-28" />
              <div className="flex items-center gap-1">
                <StatusBadge status={displayStatus(a, today)} />
                <Button size="icon" variant="ghost" onClick={() => setRemarksFor(a)} aria-label={`Remarks for ${a.name}`}>
                  <MessageSquare />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });

  return (
    <section id="my-activities" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{ownOnly ? "My activities" : "Activities on site"}</h2>
        <Link href="/schedule" className="text-primary text-sm">
          See all
        </Link>
      </div>
      {mine.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground text-sm">
            Nothing in progress or starting in the next {LOOKAHEAD_DAYS} days.
          </CardContent>
        </Card>
      ) : (
        <>
          {current.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase">Now</p>
              {renderList(current)}
            </div>
          ) : null}
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase">Next {LOOKAHEAD_DAYS} days</p>
              {renderList(upcoming)}
            </div>
          ) : null}
        </>
      )}

      <ActivityDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        activity={editing}
        projectId={projectId}
        defaultPhaseId={editing?.phaseId ?? ""}
      />
      <RemarksDialog activity={remarksFor} onOpenChange={(o) => !o && setRemarksFor(null)} />
    </section>
  );
}
