import type { Activity, AuditEntry, Phase, Project, Remark, Vendor } from "@/domain/types";

/** Everything SiteWatch stores in the browser. Also the JSON backup format (NFR-6). */
export interface DataSnapshot {
  version: 1;
  projects: Project[];
  phases: Phase[];
  activities: Activity[];
  vendors: Vendor[];
  remarks: Remark[];
  audit: AuditEntry[];
}

export const EMPTY_SNAPSHOT: DataSnapshot = {
  version: 1,
  projects: [],
  phases: [],
  activities: [],
  vendors: [],
  remarks: [],
  audit: [],
};

const KEYS: (keyof Omit<DataSnapshot, "version">)[] = [
  "projects",
  "phases",
  "activities",
  "vendors",
  "remarks",
  "audit",
];

/** Light structural check for imported backups. Returns an error message or null. */
export function checkSnapshot(value: unknown): string | null {
  if (!value || typeof value !== "object") return "File is not a SiteWatch backup.";
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return "Unsupported backup version.";
  for (const key of KEYS) {
    if (!Array.isArray(v[key])) return `Backup is missing "${key}".`;
  }
  return null;
}
