import type { ISODate } from "@/domain/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

/** Parse "YYYY-MM-DD" as a UTC calendar date (no timezone drift). */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in India (the project's timezone). */
export function todayISO(now: Date = new Date()): ISODate {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return toISODate(ist);
}

export function addDays(value: ISODate, days: number): ISODate {
  return toISODate(new Date(parseISODate(value).getTime() + days * DAY_MS));
}

/** b − a in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS);
}

/** Inclusive duration: same start and end = 1 day. */
export function durationDays(start: ISODate, end: ISODate): number {
  return diffDays(start, end) + 1;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** "21-Jun-26" — the format used in the approved programme schedule. */
export function formatDate(value: ISODate | null | undefined): string {
  if (!value) return "—";
  const d = parseISODate(value);
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  const date = formatDate(toISODate(new Date(d.getTime() + 5.5 * 3600_000)));
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${date} ${time}`;
}
