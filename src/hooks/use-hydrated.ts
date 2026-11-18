"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server render and the first client render, true afterwards.
 * Role-dependent UI waits for this so the server HTML (which can't know the
 * browser-stored user) never flashes the wrong menu or page.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
