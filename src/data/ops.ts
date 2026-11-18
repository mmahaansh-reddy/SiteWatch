/**
 * Data operations: snapshot in → snapshot out. The ONLY place that changes data.
 * Every operation checks permissions (PRD §6) and writes an audit entry (FR-1.10, FR-8.3).
 * Pure functions, so they're unit-tested and can move behind an API later unchanged.
 */
import { can, canOnRecord, type Role } from "@/domain/permissions";
import {
  cloneActivities,
  normalizeProgress,
  validateActivity,
  type ActivityInput,
} from "@/domain/schedule";
import type {
  Activity,
  AuditEntry,
  FieldChange,
  Phase,
  Remark,
  Vendor,
} from "@/domain/types";
import { checkSnapshot, EMPTY_SNAPSHOT, type DataSnapshot } from "./snapshot";

export interface Actor {
  id: string;
  name: string;
  role: Role;
  vendorId?: string;
}

export class OpError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "OpError";
  }
}

const MAX_AUDIT = 5000;

export function newId(prefix: string): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${uuid.slice(0, 8)}`;
}

/* ───────────────────────── visibility ───────────────────────── */

/** Is this activity "own" for the actor (assigned engineer / their vendor)? */
export function isOwnActivity(actor: Actor, a: Pick<Activity, "engineerId" | "vendorId">) {
  if (actor.role === "site_engineer") return a.engineerId === actor.id;
  if (actor.role === "contractor") return !!actor.vendorId && a.vendorId === actor.vendorId;
  return false;
}

export function visibleActivities(s: DataSnapshot, actor: Actor): Activity[] {
  return s.activities.filter((a) => canOnRecord(actor.role, "schedule", "view", isOwnActivity(actor, a)));
}

export function isOwnVendor(s: DataSnapshot, actor: Actor, vendorId: string): boolean {
  if (actor.role === "contractor") return actor.vendorId === vendorId;
  if (actor.role === "site_engineer") {
    return s.activities.some((a) => a.engineerId === actor.id && a.vendorId === vendorId);
  }
  return false;
}

export function visibleVendors(s: DataSnapshot, actor: Actor): Vendor[] {
  return s.vendors.filter((v) => canOnRecord(actor.role, "vendors", "view", isOwnVendor(s, actor, v.id)));
}

/* ───────────────────────── audit ───────────────────────── */

function diff<T extends object>(before: T, after: T, fields: (keyof T)[]): FieldChange[] {
  return fields
    .filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]))
    .map((f) => ({ field: String(f), from: before[f] ?? null, to: after[f] ?? null }));
}

function audit(
  s: DataSnapshot,
  actor: Actor,
  entry: Omit<AuditEntry, "id" | "at" | "userId" | "userName">,
): AuditEntry[] {
  const record: AuditEntry = {
    id: newId("au"),
    at: new Date().toISOString(),
    userId: actor.id,
    userName: actor.name,
    ...entry,
  };
  return [record, ...s.audit].slice(0, MAX_AUDIT);
}

function deny(what: string): never {
  throw new OpError(`Your role isn't allowed to ${what}.`);
}

/* ───────────────────────── phases ───────────────────────── */

export function createPhase(
  s: DataSnapshot,
  actor: Actor,
  input: { projectId: string; name: string; kind: Phase["kind"] },
): DataSnapshot {
  if (!can(actor.role, "schedule", "create")) deny("add phases");
  const name = input.name.trim();
  if (!name) throw new OpError("Phase name is required.", { name: "Name is required." });
  const order = Math.max(-1, ...s.phases.filter((p) => p.projectId === input.projectId).map((p) => p.order)) + 1;
  const phase: Phase = { id: newId("ph"), projectId: input.projectId, name, kind: input.kind, order };
  return {
    ...s,
    phases: [...s.phases, phase],
    audit: audit(s, actor, { action: "create", entity: "phase", entityId: phase.id, label: name, changes: [] }),
  };
}

export function updatePhase(
  s: DataSnapshot,
  actor: Actor,
  id: string,
  patch: Partial<Pick<Phase, "name" | "kind" | "order">>,
): DataSnapshot {
  if (!can(actor.role, "schedule", "edit")) deny("edit phases");
  const before = s.phases.find((p) => p.id === id);
  if (!before) throw new OpError("Phase not found.");
  const after: Phase = { ...before, ...patch, name: (patch.name ?? before.name).trim() };
  if (!after.name) throw new OpError("Phase name is required.", { name: "Name is required." });
  const changes = diff(before, after, ["name", "kind", "order"]);
  if (changes.length === 0) return s;
  return {
    ...s,
    phases: s.phases.map((p) => (p.id === id ? after : p)),
    audit: audit(s, actor, { action: "update", entity: "phase", entityId: id, label: after.name, changes }),
  };
}

export function deletePhase(s: DataSnapshot, actor: Actor, id: string): DataSnapshot {
  if (!can(actor.role, "schedule", "delete")) deny("delete phases");
  const phase = s.phases.find((p) => p.id === id);
  if (!phase) throw new OpError("Phase not found.");
  if (s.activities.some((a) => a.phaseId === id)) {
    throw new OpError("Move or delete this phase's activities first.");
  }
  return {
    ...s,
    phases: s.phases.filter((p) => p.id !== id),
    audit: audit(s, actor, { action: "delete", entity: "phase", entityId: id, label: phase.name, changes: [] }),
  };
}

/* ───────────────────────── activities ───────────────────────── */

export type NewActivity = Pick<
  Activity,
  "projectId" | "phaseId" | "name" | "trade" | "plannedStart" | "plannedEnd" | "predecessorId" | "vendorId" | "engineerId"
> &
  Partial<Pick<Activity, "actualStart" | "actualEnd" | "progress" | "status">>;

const ACTIVITY_FIELDS: (keyof Activity)[] = [
  "phaseId",
  "name",
  "trade",
  "plannedStart",
  "plannedEnd",
  "actualStart",
  "actualEnd",
  "progress",
  "status",
  "predecessorId",
  "vendorId",
  "engineerId",
];

/** Fields site engineers/contractors may change on their own activities (FR-1.4). */
export const OWN_EDITABLE_FIELDS = ["actualStart", "actualEnd", "progress"] as const;

function assertValid(a: ActivityInput) {
  const errors = validateActivity(a);
  const keys = Object.keys(errors);
  if (keys.length > 0) throw new OpError(errors[keys[0] as keyof ActivityInput]!, errors as Record<string, string>);
}

export function createActivity(
  s: DataSnapshot,
  actor: Actor,
  input: NewActivity,
  today: string,
): DataSnapshot {
  if (!can(actor.role, "schedule", "create")) deny("add activities");
  if (!s.phases.some((p) => p.id === input.phaseId)) throw new OpError("Choose a phase.", { phaseId: "Choose a phase." });
  const draft: Activity = {
    actualStart: null,
    actualEnd: null,
    progress: 0,
    status: "not_started",
    ...input,
    name: input.name.trim(),
    id: newId("act"),
    baselineStart: input.plannedStart,
    baselineEnd: input.plannedEnd,
    order: s.activities.filter((a) => a.phaseId === input.phaseId).length,
  };
  assertValid(draft);
  const activity = normalizeProgress(draft, today);
  return {
    ...s,
    activities: [...s.activities, activity],
    audit: audit(s, actor, { action: "create", entity: "activity", entityId: activity.id, label: activity.name, changes: [] }),
  };
}

export function updateActivity(
  s: DataSnapshot,
  actor: Actor,
  id: string,
  patch: Partial<Activity>,
  today: string,
): DataSnapshot {
  const before = s.activities.find((a) => a.id === id);
  if (!before) throw new OpError("Activity not found.");
  const own = isOwnActivity(actor, before);
  if (!canOnRecord(actor.role, "schedule", "edit", own)) deny("edit this activity");

  let allowed: Partial<Activity> = patch;
  if (!can(actor.role, "schedule", "create")) {
    // "Edit own activities" = progress updates only (FR-1.4).
    allowed = {};
    for (const key of OWN_EDITABLE_FIELDS) {
      if (key in patch) (allowed as Record<string, unknown>)[key] = patch[key];
    }
  }
  const { id: _ignoreId, baselineStart: _bs, baselineEnd: _be, projectId: _p, ...rest } = allowed;
  void _ignoreId; void _bs; void _be; void _p;

  const merged: Activity = { ...before, ...rest, name: (rest.name ?? before.name).trim() };
  assertValid(merged);
  if (merged.predecessorId === merged.id) {
    throw new OpError("An activity can't be its own predecessor.", { predecessorId: "Choose another activity." });
  }
  const after = normalizeProgress(merged, today);
  const changes = diff(before, after, ACTIVITY_FIELDS);
  if (changes.length === 0) return s;
  return {
    ...s,
    activities: s.activities.map((a) => (a.id === id ? after : a)),
    audit: audit(s, actor, { action: "update", entity: "activity", entityId: id, label: after.name, changes }),
  };
}

export function deleteActivity(s: DataSnapshot, actor: Actor, id: string): DataSnapshot {
  if (!can(actor.role, "schedule", "delete")) deny("delete activities");
  const activity = s.activities.find((a) => a.id === id);
  if (!activity) throw new OpError("Activity not found.");
  return {
    ...s,
    activities: s.activities
      .filter((a) => a.id !== id)
      .map((a) => (a.predecessorId === id ? { ...a, predecessorId: null } : a)),
    remarks: s.remarks.filter((r) => r.activityId !== id),
    audit: audit(s, actor, { action: "delete", entity: "activity", entityId: id, label: activity.name, changes: [] }),
  };
}

/** FR-1.3 floor template: copy one phase's activities into another, shifted by N days. */
export function cloneFloor(
  s: DataSnapshot,
  actor: Actor,
  input: { sourcePhaseId: string; targetPhaseId: string; offsetDays: number },
): DataSnapshot {
  if (!can(actor.role, "schedule", "create")) deny("copy floor templates");
  const source = s.phases.find((p) => p.id === input.sourcePhaseId);
  const target = s.phases.find((p) => p.id === input.targetPhaseId);
  if (!source || !target) throw new OpError("Choose both phases.");
  if (source.id === target.id) throw new OpError("Choose a different target phase.");
  if (!Number.isInteger(input.offsetDays)) throw new OpError("Offset must be a whole number of days.");
  const rows = s.activities
    .filter((a) => a.phaseId === source.id)
    .sort((a, b) => a.order - b.order);
  if (rows.length === 0) throw new OpError("The source phase has no activities.");

  const start = s.activities.filter((a) => a.phaseId === target.id).length;
  const copies = cloneActivities(
    rows,
    { phaseId: target.id, offsetDays: input.offsetDays, nameFrom: source.name, nameTo: target.name },
    () => newId("act"),
  ).map((a, i) => ({ ...a, order: start + i }));

  return {
    ...s,
    activities: [...s.activities, ...copies],
    audit: audit(s, actor, {
      action: "create",
      entity: "phase",
      entityId: target.id,
      label: `Copied ${copies.length} activities from ${source.name} to ${target.name} (+${input.offsetDays} days)`,
      changes: [],
    }),
  };
}

/* ───────────────────────── remarks (FR-1.6) ───────────────────────── */

export function addRemark(
  s: DataSnapshot,
  actor: Actor,
  input: { activityId: string; text: string; kind: Remark["kind"] },
): DataSnapshot {
  const activity = s.activities.find((a) => a.id === input.activityId);
  if (!activity) throw new OpError("Activity not found.");
  if (!canOnRecord(actor.role, "schedule", "view", isOwnActivity(actor, activity))) deny("comment on this activity");
  const text = input.text.trim();
  if (!text) throw new OpError("Write a remark first.", { text: "Required." });
  const remark: Remark = {
    id: newId("rm"),
    activityId: activity.id,
    kind: input.kind,
    text,
    userId: actor.id,
    userName: actor.name,
    at: new Date().toISOString(),
  };
  return {
    ...s,
    remarks: [...s.remarks, remark],
    audit: audit(s, actor, { action: "create", entity: "remark", entityId: remark.id, label: activity.name, changes: [{ field: "text", from: null, to: text }] }),
  };
}

/* ───────────────────────── vendors (FR-4.1) ───────────────────────── */

export type VendorInput = Omit<Vendor, "id">;

const VENDOR_FIELDS: (keyof Vendor)[] = ["name", "trade", "contactName", "phone", "email", "contractValue", "paymentTerms"];

function checkVendor(v: VendorInput) {
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = "Name is required.";
  if (!Number.isFinite(v.contractValue) || v.contractValue < 0) errors.contractValue = "Enter a valid amount.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "Enter a valid email.";
  const first = Object.values(errors)[0];
  if (first) throw new OpError(first, errors);
}

export function createVendor(s: DataSnapshot, actor: Actor, input: VendorInput): DataSnapshot {
  if (!can(actor.role, "vendors", "create")) deny("add vendors");
  checkVendor(input);
  const vendor: Vendor = { ...input, name: input.name.trim(), id: newId("v") };
  return {
    ...s,
    vendors: [...s.vendors, vendor],
    audit: audit(s, actor, { action: "create", entity: "vendor", entityId: vendor.id, label: vendor.name, changes: [] }),
  };
}

export function updateVendor(s: DataSnapshot, actor: Actor, id: string, patch: Partial<VendorInput>): DataSnapshot {
  if (!can(actor.role, "vendors", "edit")) deny("edit vendors");
  const before = s.vendors.find((v) => v.id === id);
  if (!before) throw new OpError("Vendor not found.");
  const after: Vendor = { ...before, ...patch, id };
  checkVendor(after);
  const changes = diff(before, after, VENDOR_FIELDS);
  if (changes.length === 0) return s;
  return {
    ...s,
    vendors: s.vendors.map((v) => (v.id === id ? after : v)),
    audit: audit(s, actor, { action: "update", entity: "vendor", entityId: id, label: after.name, changes }),
  };
}

export function deleteVendor(s: DataSnapshot, actor: Actor, id: string): DataSnapshot {
  if (!can(actor.role, "vendors", "delete")) deny("delete vendors");
  const vendor = s.vendors.find((v) => v.id === id);
  if (!vendor) throw new OpError("Vendor not found.");
  return {
    ...s,
    vendors: s.vendors.filter((v) => v.id !== id),
    activities: s.activities.map((a) => (a.vendorId === id ? { ...a, vendorId: null } : a)),
    audit: audit(s, actor, { action: "delete", entity: "vendor", entityId: id, label: vendor.name, changes: [] }),
  };
}

/* ───────────────────────── data tools (NFR-6) ───────────────────────── */

export function canManageData(role: Role): boolean {
  return role === "admin" || role === "pm";
}

export function replaceAll(
  s: DataSnapshot,
  actor: Actor,
  next: unknown,
  action: "import" | "reset",
  label: string,
): DataSnapshot {
  if (!canManageData(actor.role)) deny("replace project data");
  const problem = checkSnapshot(next);
  if (problem) throw new OpError(problem);
  const snapshot = next as DataSnapshot;
  return {
    ...snapshot,
    audit: audit(snapshot, actor, { action, entity: "data", entityId: "all", label, changes: [] }),
  };
}

export function clearAll(s: DataSnapshot, actor: Actor): DataSnapshot {
  if (!canManageData(actor.role)) deny("clear project data");
  // Keep the project shell so the app still has something to open.
  return {
    ...EMPTY_SNAPSHOT,
    projects: s.projects,
    audit: audit(EMPTY_SNAPSHOT, actor, { action: "reset", entity: "data", entityId: "all", label: "Cleared all data", changes: [] }),
  };
}
