/**
 * SiteWatch permissions policy — PRD §6 "User Roles & Permissions Matrix".
 *
 * Pure TypeScript (no React, no storage) so the same rules can run on a server later.
 * The UI uses it to show/hide pages and actions; repositories (T3) re-check it on every write.
 */

export type Role = "admin" | "pm" | "site_engineer" | "contractor";

export const ROLES: Role[] = ["pm", "admin", "site_engineer", "contractor"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pm: "Founder's Office / PM",
  site_engineer: "Site Engineer",
  contractor: "Contractor",
};

export type PermissionModule =
  | "dashboard"
  | "schedule"
  | "budget"
  | "materials"
  | "vendors"
  | "reports"
  | "diary"
  | "equipment"
  | "change_orders"
  | "documents"
  | "payments"
  | "warranty"
  | "notifications"
  | "users";

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  schedule: "Schedule",
  budget: "Budget",
  materials: "Materials",
  vendors: "Vendors",
  reports: "Reports",
  diary: "Site Diary",
  equipment: "Equipment",
  change_orders: "Change Orders",
  documents: "Permits & Documents",
  payments: "Payment Milestones",
  warranty: "Warranty / DLP",
  notifications: "Notifications",
  users: "User Management",
};

/**
 * - view / create / edit / delete: standard record access
 * - approve: approve or reject (indents, invoices, change orders, payments)
 * - request: raise a request that someone else approves (indent, change order)
 * - log: record a site event (material receipt, equipment usage, warranty item)
 * - respond: reply to an item raised against you (contractor on warranty items)
 */
export type Action = "view" | "create" | "edit" | "delete" | "approve" | "request" | "log" | "respond";

export const ACTION_LABELS: Record<Action, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  request: "Request",
  log: "Log",
  respond: "Respond",
};

/**
 * all = every record in the project.
 * own = only records linked to the user: activities assigned to them (site engineer),
 *       or to their vendor/trade (contractor); entries they created themselves.
 */
export type Scope = "all" | "own";

export type Grant = Partial<Record<Action, Scope>>;

interface MatrixCell {
  grant: Grant;
  /** Wording from the PRD §6 table, shown in the UI. */
  summary: string;
}

type Matrix = Record<PermissionModule, Partial<Record<Role, MatrixCell>>>;

const FULL: Grant = { view: "all", create: "all", edit: "all", delete: "all" };
const FULL_APPROVE: Grant = { ...FULL, approve: "all" };

/**
 * Decision (README §9): approvals belong to the Founder's Office / PM (PRD §2.2 "approves indents
 * and payments"). Admin has "Full" record access everywhere but does not approve money or scope.
 */
export const PERMISSION_MATRIX: Matrix = {
  dashboard: {
    pm: { grant: { view: "all" }, summary: "Full" },
    admin: { grant: { view: "all" }, summary: "Full" },
  },
  schedule: {
    site_engineer: { grant: { view: "own", edit: "own" }, summary: "Edit own activities" },
    contractor: { grant: { view: "own", edit: "own" }, summary: "Edit own activities" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  budget: {
    site_engineer: { grant: { view: "all" }, summary: "View only" },
    contractor: { grant: { view: "own" }, summary: "View own trade" },
    pm: { grant: FULL_APPROVE, summary: "Full + Approve" },
    admin: { grant: FULL, summary: "Full" },
  },
  materials: {
    site_engineer: {
      grant: { view: "all", request: "own", log: "all" },
      summary: "Raise indent, log receipt",
    },
    contractor: { grant: { view: "all", request: "own" }, summary: "Raise indent" },
    // PM also maintains the material master (FR-3.1).
    pm: { grant: { ...FULL_APPROVE, delete: undefined }, summary: "Approve" },
    admin: { grant: FULL, summary: "Full" },
  },
  vendors: {
    site_engineer: { grant: { view: "own" }, summary: "View assigned" },
    contractor: { grant: { view: "own" }, summary: "View own record" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  reports: {
    site_engineer: { grant: { view: "own" }, summary: "View own DPR" },
    contractor: { grant: { view: "own" }, summary: "View own DPR" },
    pm: { grant: { view: "all", create: "all" }, summary: "Full" },
    admin: { grant: { view: "all", create: "all" }, summary: "Full" },
  },
  diary: {
    site_engineer: {
      grant: { view: "all", create: "own", edit: "own" },
      summary: "Submit / edit own",
    },
    contractor: { grant: { view: "all" }, summary: "View" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  equipment: {
    site_engineer: { grant: { view: "all", log: "all" }, summary: "Log usage" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  change_orders: {
    contractor: { grant: { view: "own", request: "own" }, summary: "Request" },
    pm: { grant: FULL_APPROVE, summary: "Approve" },
    admin: { grant: FULL, summary: "Full" },
  },
  documents: {
    site_engineer: { grant: { view: "all" }, summary: "View" },
    contractor: { grant: { view: "own" }, summary: "View own" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  payments: {
    contractor: { grant: { view: "own" }, summary: "View own" },
    pm: { grant: FULL_APPROVE, summary: "Full + Approve" },
    admin: { grant: FULL, summary: "Full" },
  },
  warranty: {
    site_engineer: { grant: { view: "all", log: "all" }, summary: "Log item" },
    contractor: { grant: { view: "own", respond: "own" }, summary: "View / respond to own" },
    pm: { grant: FULL, summary: "Full" },
    admin: { grant: FULL, summary: "Full" },
  },
  notifications: {
    site_engineer: { grant: { view: "own" }, summary: "Own alerts" },
    contractor: { grant: { view: "own" }, summary: "Own alerts" },
    // FR-7.2: PM configures thresholds and recipients.
    pm: { grant: { view: "own", edit: "all" }, summary: "Own alerts + configure" },
    admin: { grant: { view: "own", edit: "all" }, summary: "Own alerts + configure" },
  },
  users: {
    admin: { grant: FULL, summary: "Full" },
  },
};

/** The scope a role has for an action on a module, or null if not allowed. */
export function scopeFor(role: Role, module: PermissionModule, action: Action): Scope | null {
  return PERMISSION_MATRIX[module][role]?.grant[action] ?? null;
}

export function can(role: Role, module: PermissionModule, action: Action): boolean {
  return scopeFor(role, module, action) !== null;
}

/**
 * Record-level check. `isOwn` says whether the record is linked to the user
 * (assigned to them, belongs to their vendor, or created by them).
 */
export function canOnRecord(
  role: Role,
  module: PermissionModule,
  action: Action,
  isOwn: boolean,
): boolean {
  const scope = scopeFor(role, module, action);
  return scope === "all" || (scope === "own" && isOwn);
}

export function grantFor(role: Role, module: PermissionModule): Grant {
  return PERMISSION_MATRIX[module][role]?.grant ?? {};
}

export function summaryFor(role: Role, module: PermissionModule): string {
  return PERMISSION_MATRIX[module][role]?.summary ?? "No access";
}

/** Roles whose primary surface is the mobile site view (PRD §2.2). */
export function isSiteRole(role: Role): boolean {
  return role === "site_engineer" || role === "contractor";
}

/** Where a user lands after "signing in" or switching user. */
export function homeFor(role: Role): "/site" | "/dashboard" {
  return isSiteRole(role) ? "/site" : "/dashboard";
}
