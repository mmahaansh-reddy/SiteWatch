/**
 * TEMPORARY demo identities for the app shell (T1).
 * Replaced in T4 (seed data in IndexedDB) and T5 (users, roles, permissions).
 */

export type Role = "admin" | "pm" | "site_engineer" | "contractor";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pm: "Founder's Office / PM",
  site_engineer: "Site Engineer",
  contractor: "Contractor",
};

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
}

export interface DemoProject {
  id: string;
  name: string;
  location: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-admin", name: "Admin User", role: "admin" },
  { id: "u-pm", name: "Founder's Office", role: "pm" },
  { id: "u-se", name: "Site Engineer", role: "site_engineer" },
  { id: "u-con", name: "Shree Mahalakshmi & Co.", role: "contractor" },
];

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "p-foxsense-vnp",
    name: "Foxsense Commercial Building",
    location: "Vellanaipatti Road, Coimbatore",
  },
];

/** Roles whose primary surface is the mobile site view (PRD §2.2). */
export function isSiteRole(role: Role): boolean {
  return role === "site_engineer" || role === "contractor";
}
