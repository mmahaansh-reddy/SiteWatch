"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEMO_PROJECTS, DEMO_USERS } from "@/lib/demo-identities";

/**
 * Session = who is "logged in" and which project is open.
 * Only small UI preferences live in localStorage; project data goes to IndexedDB (T3).
 */
interface SessionState {
  currentUserId: string;
  currentProjectId: string;
  hasHydrated: boolean;
  setCurrentUser: (id: string) => void;
  setCurrentProject: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
}

const DEFAULT_USER_ID = DEMO_USERS.find((u) => u.role === "pm")?.id ?? "u-pm";
const DEFAULT_PROJECT_ID = DEMO_PROJECTS[0]?.id ?? "p-foxsense-vnp";

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      currentUserId: DEFAULT_USER_ID,
      currentProjectId: DEFAULT_PROJECT_ID,
      hasHydrated: false,
      setCurrentUser: (id) => set({ currentUserId: id }),
      setCurrentProject: (id) => set({ currentProjectId: id }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "sitewatch.session",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        currentProjectId: state.currentProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useCurrentUser() {
  const id = useSession((s) => s.currentUserId);
  return DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS[0]!;
}

export function useCurrentProject() {
  const id = useSession((s) => s.currentProjectId);
  return DEMO_PROJECTS.find((p) => p.id === id) ?? DEMO_PROJECTS[0]!;
}
