/**
 * Schedule rules (PRD §3.1). Pure functions — unit-tested, reusable server-side later.
 */
import { addDays, diffDays, durationDays, isValidISODate, maxDate } from "@/lib/dates";

import type { Activity, ISODate } from "./types";

export type DisplayStatus = "not_started" | "in_progress" | "completed" | "on_hold" | "delayed";

export const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
  delayed: "Delayed",
};

type DatesOnly = Pick<
  Activity,
  "plannedStart" | "plannedEnd" | "actualStart" | "actualEnd" | "progress" | "status"
>;

/**
 * Projected finish date.
 * - Finished: the actual end.
 * - Not started: planned end, pushed out if the start is already late.
 * - In progress: today + remaining work at the rate achieved so far.
 */
export function projectedEnd(a: DatesOnly, today: ISODate): ISODate {
  if (a.actualEnd) return a.actualEnd;
  const duration = durationDays(a.plannedStart, a.plannedEnd);

  if (!a.actualStart) {
    if (today <= a.plannedStart) return a.plannedEnd;
    return addDays(today, duration - 1);
  }

  if (a.progress <= 0) {
    return maxDate(maxDate(a.plannedEnd, addDays(a.actualStart, duration - 1)), today);
  }

  const elapsed = Math.max(1, durationDays(a.actualStart, today));
  const ratePerDay = a.progress / elapsed;
  const remainingDays = Math.ceil((100 - a.progress) / ratePerDay);
  return addDays(today, remainingDays);
}

/** Positive = days late against the current plan; negative = ahead (FR-1.5). */
export function slipDays(a: DatesOnly, today: ISODate): number {
  return diffDays(a.plannedEnd, projectedEnd(a, today));
}

/** Positive = days late against the original baseline. */
export function baselineSlipDays(a: DatesOnly & Pick<Activity, "baselineEnd">, today: ISODate) {
  return diffDays(a.baselineEnd, projectedEnd(a, today));
}

export function isDelayed(a: DatesOnly, today: ISODate): boolean {
  return a.status !== "on_hold" && slipDays(a, today) > 0;
}

export function displayStatus(a: DatesOnly, today: ISODate): DisplayStatus {
  if (a.status === "completed") return "completed";
  if (a.status === "on_hold") return "on_hold";
  if (isDelayed(a, today)) return "delayed";
  return a.status;
}

/** Duration-weighted % completion across activities. */
export function weightedProgress(activities: DatesOnly[]): number {
  let weight = 0;
  let done = 0;
  for (const a of activities) {
    const w = durationDays(a.plannedStart, a.plannedEnd);
    weight += w;
    done += w * a.progress;
  }
  return weight === 0 ? 0 : Math.round((done / weight) * 10) / 10;
}

/** Latest projected finish across all activities, or null if none. */
export function projectedFinish(activities: DatesOnly[], today: ISODate): ISODate | null {
  let latest: ISODate | null = null;
  for (const a of activities) {
    const end = projectedEnd(a, today);
    if (!latest || end > latest) latest = end;
  }
  return latest;
}

/** Soft predecessor checks — warnings only, never blocks a save (FR-1.9). */
export function predecessorWarnings(
  a: Pick<Activity, "id" | "predecessorId" | "plannedStart" | "actualStart">,
  all: Pick<Activity, "id" | "name" | "plannedEnd" | "status">[],
): string[] {
  if (!a.predecessorId) return [];
  if (a.predecessorId === a.id) return ["An activity can't be its own predecessor."];
  const pred = all.find((p) => p.id === a.predecessorId);
  if (!pred) return ["Predecessor no longer exists."];

  const warnings: string[] = [];
  if (a.actualStart && pred.status !== "completed") {
    warnings.push(`Started before predecessor "${pred.name}" was completed.`);
  }
  if (a.plannedStart <= pred.plannedEnd) {
    warnings.push(`Overlaps predecessor "${pred.name}" (planned to start before it ends).`);
  }
  return warnings;
}

export interface ActivityInput {
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
}

/** Hard validation — returns field → message. Empty object means valid. */
export function validateActivity(input: ActivityInput): Partial<Record<keyof ActivityInput, string>> {
  const errors: Partial<Record<keyof ActivityInput, string>> = {};
  if (!input.name.trim()) errors.name = "Name is required.";
  if (!isValidISODate(input.plannedStart)) errors.plannedStart = "Enter a valid date.";
  if (!isValidISODate(input.plannedEnd)) errors.plannedEnd = "Enter a valid date.";
  if (!errors.plannedStart && !errors.plannedEnd && input.plannedEnd < input.plannedStart) {
    errors.plannedEnd = "End can't be before start.";
  }
  if (input.actualStart && !isValidISODate(input.actualStart)) errors.actualStart = "Invalid date.";
  if (input.actualEnd && !isValidISODate(input.actualEnd)) errors.actualEnd = "Invalid date.";
  if (input.actualEnd && !input.actualStart) errors.actualStart = "Add the actual start first.";
  if (
    input.actualStart &&
    input.actualEnd &&
    !errors.actualStart &&
    !errors.actualEnd &&
    input.actualEnd < input.actualStart
  ) {
    errors.actualEnd = "Actual end can't be before actual start.";
  }
  if (!Number.isFinite(input.progress) || input.progress < 0 || input.progress > 100) {
    errors.progress = "Progress must be 0–100.";
  }
  return errors;
}

/**
 * Keep progress, status and actual dates consistent after an update:
 * 100 % ⇒ completed with an actual end; an actual end ⇒ 100 %; any progress ⇒ started.
 */
export function normalizeProgress<T extends DatesOnly>(a: T, today: ISODate): T {
  const next = { ...a, progress: Math.max(0, Math.min(100, Math.round(a.progress))) };
  if (next.actualEnd) next.progress = 100;
  if (next.progress === 100) {
    next.actualStart = next.actualStart ?? today;
    next.actualEnd = next.actualEnd ?? maxDate(today, next.actualStart);
    next.status = "completed";
  } else if (next.status === "completed") {
    next.status = "in_progress";
  }
  if (next.progress > 0 && !next.actualStart) next.actualStart = today;
  if (next.status === "not_started" && next.actualStart) next.status = "in_progress";
  return next;
}

/**
 * Floor template (FR-1.3): copy a phase's activity sequence to another phase, shifted by
 * `offsetDays`, with fresh progress and predecessors re-linked inside the copied set.
 */
export function cloneActivities(
  source: Activity[],
  target: { phaseId: string; offsetDays: number; nameFrom?: string; nameTo?: string },
  newId: () => string,
): Activity[] {
  const idMap = new Map<string, string>();
  for (const a of source) idMap.set(a.id, newId());

  const rename = (name: string) =>
    target.nameFrom && target.nameTo ? name.split(target.nameFrom).join(target.nameTo) : name;

  return source.map((a) => {
    const plannedStart = addDays(a.plannedStart, target.offsetDays);
    const plannedEnd = addDays(a.plannedEnd, target.offsetDays);
    return {
      ...a,
      id: idMap.get(a.id)!,
      phaseId: target.phaseId,
      name: rename(a.name),
      baselineStart: plannedStart,
      baselineEnd: plannedEnd,
      plannedStart,
      plannedEnd,
      actualStart: null,
      actualEnd: null,
      progress: 0,
      status: "not_started",
      predecessorId: a.predecessorId ? (idMap.get(a.predecessorId) ?? null) : null,
    };
  });
}
