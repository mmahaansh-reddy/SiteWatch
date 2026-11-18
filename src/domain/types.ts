/**
 * Core SiteWatch entities (PRD §5). Dates are ISO calendar dates ("2026-11-19").
 * Money is stored in integer paise. More entities are added module by module.
 */

export type ISODate = string;
export type ISODateTime = string;

export interface Project {
  id: string;
  name: string;
  location: string;
  client: string;
  contractor: string;
  baselineStart: ISODate;
  baselineEnd: ISODate;
  /** Per-project alert thresholds (FR-2.5, FR-6.3, FR-7.2). */
  settings: {
    criticalDelayDays: number;
    budgetAlertPct: number;
  };
}

export type PhaseKind = "foundation" | "basement" | "floor" | "external" | "handover" | "other";

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  kind: PhaseKind;
  /** Display order. */
  order: number;
}

export type Trade =
  | "earthwork"
  | "rcc"
  | "masonry"
  | "plastering"
  | "joinery"
  | "plumbing"
  | "electrical"
  | "flooring"
  | "painting"
  | "waterproofing"
  | "general";

export const TRADE_LABELS: Record<Trade, string> = {
  earthwork: "Earthwork",
  rcc: "RCC",
  masonry: "Masonry",
  plastering: "Plastering",
  joinery: "Joinery / Grill",
  plumbing: "Plumbing",
  electrical: "Electrical",
  flooring: "Flooring & Tiling",
  painting: "Painting",
  waterproofing: "Waterproofing",
  general: "General",
};

export const TRADES = Object.keys(TRADE_LABELS) as Trade[];

/** Stored status; "delayed" is derived, never stored (FR-1.5). */
export type ActivityStatus = "not_started" | "in_progress" | "completed" | "on_hold";

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
};

export interface Activity {
  id: string;
  projectId: string;
  phaseId: string;
  name: string;
  trade: Trade;
  /** Baseline — never changed by edits after approval of change orders (FR-12.4). */
  baselineStart: ISODate;
  baselineEnd: ISODate;
  /** Current plan. */
  plannedStart: ISODate;
  plannedEnd: ISODate;
  actualStart: ISODate | null;
  actualEnd: ISODate | null;
  /** 0–100. */
  progress: number;
  status: ActivityStatus;
  predecessorId: string | null;
  vendorId: string | null;
  engineerId: string | null;
  order: number;
}

export interface Remark {
  id: string;
  activityId: string;
  text: string;
  /** Exception tag so strikes / ground conditions / access limits are reportable (§1.2). */
  kind: "note" | "delay" | "ground" | "access" | "equipment";
  userId: string;
  userName: string;
  at: ISODateTime;
}

export const REMARK_KIND_LABELS: Record<Remark["kind"], string> = {
  note: "Note",
  delay: "Delay / strike",
  ground: "Ground condition",
  access: "Access restriction",
  equipment: "Equipment",
};

export interface Vendor {
  id: string;
  name: string;
  trade: Trade;
  contactName: string;
  phone: string;
  email: string;
  /** Integer paise. */
  contractValue: number;
  paymentTerms: string;
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

/** FR-1.10, FR-8.3, NFR-8. */
export interface AuditEntry {
  id: string;
  at: ISODateTime;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete" | "import" | "reset";
  entity: "project" | "phase" | "activity" | "vendor" | "remark" | "data";
  entityId: string;
  label: string;
  changes: FieldChange[];
}
