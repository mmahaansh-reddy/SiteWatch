"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { todayISO } from "@/lib/dates";
import { DEMO_USERS } from "@/lib/demo-identities";
import { useSession } from "@/stores/session";

import { idbStorage } from "./idb-storage";
import * as ops from "./ops";
import { buildDemoData } from "./seed";
import { EMPTY_SNAPSHOT, type DataSnapshot } from "./snapshot";

export type Result = { ok: true } | { ok: false; error: string; fieldErrors: Record<string, string> };

interface DataState extends DataSnapshot {
  /** True once IndexedDB has been read. Screens wait for this. */
  ready: boolean;
  /** Set after the first load so clearing data doesn't re-seed it. */
  initialized: boolean;
  /** Run an operation as the current user; saves automatically. */
  run: (op: (s: DataSnapshot, actor: ops.Actor, today: string) => DataSnapshot) => Result;
}

function currentActor(): ops.Actor {
  const id = useSession.getState().currentUserId;
  const user = DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS[0]!;
  return { id: user.id, name: user.name, role: user.role, vendorId: user.vendorId };
}

function pickSnapshot(s: DataState): DataSnapshot {
  return {
    version: 1,
    projects: s.projects,
    phases: s.phases,
    activities: s.activities,
    vendors: s.vendors,
    remarks: s.remarks,
    audit: s.audit,
  };
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SNAPSHOT,
      ready: false,
      initialized: false,
      run: (op) => {
        try {
          const next = op(pickSnapshot(get()), currentActor(), todayISO());
          set(next);
          return { ok: true };
        } catch (err) {
          if (err instanceof ops.OpError) {
            return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
          }
          console.error(err);
          return { ok: false, error: "Something went wrong. Please try again.", fieldErrors: {} };
        }
      },
    }),
    {
      name: "sitewatch.data",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ ...pickSnapshot(s), initialized: s.initialized }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Could not load saved data", error);
        // First visit: load the Foxsense demo project so the app isn't empty.
        if (state && !state.initialized) {
          useData.setState({ ...buildDemoData(), initialized: true });
        }
        useData.setState({ ready: true });
      },
    },
  ),
);

/** Snapshot of the current data, for read-only helpers. */
export function useSnapshot(): DataSnapshot {
  const projects = useData((s) => s.projects);
  const phases = useData((s) => s.phases);
  const activities = useData((s) => s.activities);
  const vendors = useData((s) => s.vendors);
  const remarks = useData((s) => s.remarks);
  const audit = useData((s) => s.audit);
  return { version: 1, projects, phases, activities, vendors, remarks, audit };
}

export function useActor(): ops.Actor {
  const id = useSession((s) => s.currentUserId);
  const user = DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS[0]!;
  return { id: user.id, name: user.name, role: user.role, vendorId: user.vendorId };
}

/** Download everything as a JSON backup (NFR-6). */
export function downloadBackup() {
  const data = pickSnapshot(useData.getState());
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sitewatch-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export { buildDemoData };
