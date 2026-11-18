"use client";

import { useData } from "@/data/store";
import { useHydrated } from "@/hooks/use-hydrated";

/** True once the browser has loaded saved data from IndexedDB. */
export function useDataReady(): boolean {
  const hydrated = useHydrated();
  const ready = useData((s) => s.ready);
  return hydrated && ready;
}

/** Shows a skeleton until saved data is loaded. */
export function DataReady({ children }: { children: React.ReactNode }) {
  const ready = useDataReady();
  if (!ready) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading data">
        <div className="bg-muted h-10 animate-pulse rounded-md" />
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      </div>
    );
  }
  return <>{children}</>;
}
