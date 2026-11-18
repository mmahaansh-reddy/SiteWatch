import {
  BarChart3,
  BookOpen,
  CalendarRange,
  ClipboardList,
  FileStack,
  FileDiff,
  GanttChartSquare,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  Bell,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Wrench,
  Banknote,
} from "lucide-react";

import { can, type PermissionModule, type Role } from "@/domain/permissions";

export type ModuleSlug =
  | "dashboard"
  | "schedule"
  | "gantt"
  | "budget"
  | "vendors"
  | "materials"
  | "diary"
  | "equipment"
  | "change-orders"
  | "payments"
  | "documents"
  | "warranty"
  | "reports"
  | "notifications"
  | "admin";

export interface NavItem {
  slug: ModuleSlug;
  label: string;
  href: `/${string}`;
  icon: LucideIcon;
  /** One-line description shown on placeholder pages and tooltips. */
  description: string;
  /** PRD section(s) this module implements. */
  prd: string;
  /** Plan task that delivers the module (see README §4). */
  task: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        slug: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Overall progress, schedule slip, budget use and pending approvals.",
        prd: "FR-6.1",
        task: "T16",
      },
      {
        slug: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        description: "Due, overdue, approval and threshold alerts.",
        prd: "§3.7",
        task: "T17",
      },
    ],
  },
  {
    label: "Schedule",
    items: [
      {
        slug: "schedule",
        label: "Activities",
        href: "/schedule",
        icon: CalendarRange,
        description: "Phases, activities, floor templates and remarks.",
        prd: "§3.1",
        task: "T6",
      },
      {
        slug: "gantt",
        label: "Gantt",
        href: "/gantt",
        icon: GanttChartSquare,
        description: "Planned vs actual timeline with delay and vendor ownership.",
        prd: "FR-1.7, FR-4.5",
        task: "T8",
      },
      {
        slug: "diary",
        label: "Site Diary",
        href: "/diary",
        icon: BookOpen,
        description: "Daily log: weather, workforce, equipment, visitors, work done.",
        prd: "§3.10, §3.5",
        task: "T12",
      },
      {
        slug: "change-orders",
        label: "Change Orders",
        href: "/change-orders",
        icon: FileDiff,
        description: "Scope changes with cost and schedule impact.",
        prd: "§3.12",
        task: "T13",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        slug: "budget",
        label: "Budget & BOQ",
        href: "/budget",
        icon: Wallet,
        description: "BOQ, invoices and budget vs actual by phase and trade.",
        prd: "§3.2",
        task: "T9",
      },
      {
        slug: "payments",
        label: "Payment Schedule",
        href: "/payments",
        icon: Banknote,
        description: "Phase-linked payment milestones and upcoming cash-flow.",
        prd: "§3.14",
        task: "T10",
      },
      {
        slug: "vendors",
        label: "Vendors",
        href: "/vendors",
        icon: Truck,
        description: "Vendor master, work orders and payment status.",
        prd: "§3.4",
        task: "T9",
      },
    ],
  },
  {
    label: "Site",
    items: [
      {
        slug: "materials",
        label: "Materials",
        href: "/materials",
        icon: Package,
        description: "Stock, indents, receipts and consumption.",
        prd: "§3.3",
        task: "T11",
      },
      {
        slug: "equipment",
        label: "Equipment",
        href: "/equipment",
        icon: Wrench,
        description: "Register, daily usage, idle time and maintenance.",
        prd: "§3.11",
        task: "T12",
      },
      {
        slug: "warranty",
        label: "Warranty / DLP",
        href: "/warranty",
        icon: ShieldCheck,
        description: "Defect liability items, response times and DLP expiry.",
        prd: "§3.15",
        task: "T15",
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        slug: "documents",
        label: "Permits & Docs",
        href: "/documents",
        icon: FileStack,
        description: "Permits, drawings, contracts and certificates with versions.",
        prd: "§3.13, FR-9.2",
        task: "T14",
      },
      {
        slug: "reports",
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "DPR, critical delays, floor/trade comparisons and exports.",
        prd: "§3.6",
        task: "T16",
      },
      {
        slug: "admin",
        label: "Users & Audit",
        href: "/admin",
        icon: Users,
        description: "Users, roles, project assignment and audit log.",
        prd: "§3.8",
        task: "T5",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Which permission module guards each page. */
export const NAV_PERMISSION: Record<ModuleSlug, PermissionModule> = {
  dashboard: "dashboard",
  notifications: "notifications",
  schedule: "schedule",
  gantt: "schedule",
  diary: "diary",
  "change-orders": "change_orders",
  budget: "budget",
  payments: "payments",
  vendors: "vendors",
  materials: "materials",
  equipment: "equipment",
  warranty: "warranty",
  documents: "documents",
  reports: "reports",
  admin: "users",
};

/** Pages that have their own route folder (everything else uses the placeholder route). */
export const BUILT_PAGES: ReadonlySet<ModuleSlug> = new Set<ModuleSlug>(["dashboard", "admin", "schedule", "vendors"]);

export function canSeePage(role: Role, slug: ModuleSlug): boolean {
  return can(role, NAV_PERMISSION[slug], "view");
}

/** Navigation filtered to the pages a role may open; empty groups are dropped. */
export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeePage(role, item.slug)),
  })).filter((group) => group.items.length > 0);
}

/** First web page a role can open (site roles have no dashboard home). */
export function firstWebPageFor(role: Role): NavItem | undefined {
  const preferred = (["dashboard", "schedule"] as const)
    .map((slug) => findNavItem(slug))
    .find((item) => item && canSeePage(role, item.slug));
  return preferred ?? ALL_NAV_ITEMS.find((item) => canSeePage(role, item.slug));
}

export function findNavItem(slug: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.slug === slug);
}

/** Entry point for the mobile site view (Site Engineer / Contractor). */
export const SITE_VIEW = {
  label: "Site view",
  href: "/site",
  icon: HardHat,
  secondaryIcon: ClipboardList,
} as const;
