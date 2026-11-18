"use client";

import type { StateStorage } from "zustand/middleware";

/**
 * Minimal IndexedDB key–value storage for zustand's persist middleware.
 * IndexedDB (not localStorage) because localStorage caps at ~5 MB and photos/PDFs come later.
 * Falls back to memory if IndexedDB is unavailable (e.g. some private-browsing modes).
 */
const DB_NAME = "sitewatch";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB"));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      const value = await run<string | undefined>("readonly", (s) => s.get(name) as IDBRequest<string | undefined>);
      return value ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  async setItem(name, value) {
    try {
      await run("readwrite", (s) => s.put(value, name));
    } catch {
      memory.set(name, value);
    }
  },
  async removeItem(name) {
    try {
      await run("readwrite", (s) => s.delete(name));
    } catch {
      memory.delete(name);
    }
  },
};
