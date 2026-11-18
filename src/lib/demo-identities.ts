/**
 * TEMPORARY demo identities for the app shell.
 * Replaced by seeded users in IndexedDB (T4) and the user-management screen (T5).
 */
import type { Role } from "@/domain/permissions";

export { ROLE_LABELS, isSiteRole, type Role } from "@/domain/permissions";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  /** Contractor users are linked to a vendor; drives "own" scope. */
  vendorId?: string;
}

export interface DemoProject {
  id: string;
  name: string;
  location: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-pm", name: "Founder's Office", role: "pm" },
  { id: "u-admin", name: "Admin User", role: "admin" },
  { id: "u-se", name: "Site Engineer", role: "site_engineer" },
  { id: "u-con", name: "Shree Mahalakshmi & Co.", role: "contractor", vendorId: "v-smc" },
];

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "p-foxsense-vnp",
    name: "Foxsense Commercial Building",
    location: "Vellanaipatti Road, Coimbatore",
  },
];
