/**
 * Demo data: the Foxsense commercial building, based on PRD §1.2 and Appendix A.
 * Activity names follow the approved programme's trade sequence; dates fall inside the
 * Appendix A phase windows. Actuals are as-of SEED_DATE. Clearly sample data — replace
 * with the real 79-activity schedule when available (README Q1).
 */
import { addDays, durationDays } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";
import { normalizeProgress } from "@/domain/schedule";
import type { Activity, Phase, Project, Remark, Trade, Vendor } from "@/domain/types";

import type { DataSnapshot } from "./snapshot";

export const DEMO_PROJECT_ID = "p-foxsense-vnp";
const SEED_DATE = "2026-11-19";
const SE = "u-se";

const project: Project = {
  id: DEMO_PROJECT_ID,
  name: "Foxsense Commercial Building",
  location: "Vellanaipatti Road, Coimbatore",
  client: "M/S. Foxsense Innovations",
  contractor: "Shree Mahalakshmi and Co.",
  baselineStart: "2026-06-21",
  baselineEnd: "2027-09-30",
  settings: { criticalDelayDays: 3, budgetAlertPct: 90 },
};

const vendors: Vendor[] = [
  v("v-smc", "Shree Mahalakshmi and Co.", "rcc", "R. Senthil Kumar", 4_20_00_000, "Running bills monthly; 5% retention"),
  v("v-kem", "Kovai Earth Movers", "earthwork", "M. Prakash", 18_50_000, "On completion of excavation"),
  v("v-sbm", "Sri Balaji Masonry Works", "masonry", "K. Murugan", 62_00_000, "Fortnightly on measured work"),
  v("v-aqp", "Aqua Line Plumbing", "plumbing", "S. Ramesh", 38_00_000, "40% conduits, 60% fittings"),
  v("v-svf", "Sri Vinayaga Fabrication", "joinery", "P. Ganesh", 27_50_000, "Per floor on fixing"),
  v("v-tns", "Tile n Stone Interiors", "flooring", "A. Faizal", 54_00_000, "Per floor on completion"),
  v("v-ccp", "Colour Craft Painters", "painting", "D. Vignesh", 31_00_000, "Per floor; 5% retention"),
];

function v(
  id: string,
  name: string,
  trade: Trade,
  contactName: string,
  contractRupees: number,
  paymentTerms: string,
): Vendor {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 12);
  return {
    id,
    name,
    trade,
    contactName,
    phone: "+91 98" + String(Math.abs(hash(id)) % 1_00_00_000).padStart(8, "0"),
    email: `${slug}@example.in`,
    contractValue: rupeesToPaise(contractRupees),
    paymentTerms,
  };
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

const PHASES: { id: string; name: string; kind: Phase["kind"]; start: string; end: string }[] = [
  { id: "ph-found", name: "Foundation", kind: "foundation", start: "2026-06-21", end: "2026-07-29" },
  { id: "ph-base", name: "Basement", kind: "basement", start: "2026-07-24", end: "2026-10-09" },
  { id: "ph-stilt", name: "Stilt Floor", kind: "floor", start: "2026-09-19", end: "2027-02-01" },
  { id: "ph-f1", name: "First Floor", kind: "floor", start: "2026-11-16", end: "2027-03-15" },
  { id: "ph-f2", name: "Second Floor", kind: "floor", start: "2026-12-16", end: "2027-04-27" },
  { id: "ph-f3", name: "Third Floor", kind: "floor", start: "2027-01-28", end: "2027-06-09" },
  { id: "ph-f4", name: "Fourth Floor", kind: "floor", start: "2027-03-12", end: "2027-07-22" },
  { id: "ph-ext", name: "Terrace & External", kind: "external", start: "2027-04-24", end: "2027-08-24" },
  { id: "ph-hand", name: "Finishing & Handover", kind: "handover", start: "2027-07-05", end: "2027-09-30" },
];

type Row = [name: string, trade: Trade, from: number, to: number, vendor: string | null];

/** Fixed activity lists for one-off phases (fractions of the phase window). */
const FIXED: Record<string, Row[]> = {
  "ph-found": [
    ["Marking & setting out", "earthwork", 0, 0.05, "v-kem"],
    ["Earthwork excavation", "earthwork", 0.03, 0.35, "v-kem"],
    ["Lift-pit works", "rcc", 0.3, 0.5, "v-smc"],
    ["PCC below raft", "rcc", 0.45, 0.6, "v-smc"],
    ["Footing base", "rcc", 0.55, 0.75, "v-smc"],
    ["Raft & retaining-wall RCC", "rcc", 0.7, 1, "v-smc"],
  ],
  "ph-base": [
    ["Column & lift-wall RCC (basement)", "rcc", 0, 0.35, "v-smc"],
    ["Basement roof slab", "rcc", 0.3, 0.65, "v-smc"],
    ["Ramp slab & beam", "rcc", 0.55, 0.85, "v-smc"],
    ["Basement waterproofing", "waterproofing", 0.7, 0.92, "v-smc"],
    ["Backfilling", "earthwork", 0.85, 1, "v-kem"],
  ],
  "ph-ext": [
    ["Terrace masonry", "masonry", 0, 0.25, "v-sbm"],
    ["Terrace plastering & flooring", "plastering", 0.2, 0.5, "v-smc"],
    ["Weathering course", "waterproofing", 0.35, 0.6, "v-smc"],
    ["External plastering", "plastering", 0.3, 0.8, "v-smc"],
    ["External painting", "painting", 0.7, 1, "v-ccp"],
  ],
  "ph-hand": [
    ["Joinery fixing — all floors", "joinery", 0, 0.45, "v-svf"],
    ["Plumbing fittings", "plumbing", 0.25, 0.65, "v-aqp"],
    ["Hand rails", "joinery", 0.45, 0.7, "v-svf"],
    ["Cleaning", "general", 0.7, 0.9, null],
    ["Handover", "general", 0.95, 1, null],
  ],
};

/** The repeating floor-wise trade sequence (PRD §1.2) — the floor template. */
const FLOOR_SEQUENCE: Row[] = [
  ["Column & roof slab RCC", "rcc", 0, 0.18, "v-smc"],
  ["Slab deshuttering", "rcc", 0.18, 0.25, "v-smc"],
  ["AAC / solid block masonry", "masonry", 0.22, 0.42, "v-sbm"],
  ["Lintel & sunshade", "rcc", 0.35, 0.45, "v-smc"],
  ["Grill / joinery fixing", "joinery", 0.42, 0.52, "v-svf"],
  ["Concealed plumbing conduits", "plumbing", 0.45, 0.58, "v-aqp"],
  ["Internal plastering", "plastering", 0.55, 0.75, "v-smc"],
  ["Flooring & wall tiling", "flooring", 0.72, 0.9, "v-tns"],
  ["Internal painting", "painting", 0.85, 1, "v-ccp"],
];

/** Days late at finish for specific seeded activities (real exceptions from the programme). */
const SLIPS: Record<string, number> = {
  "Earthwork excavation": 6, // JCB strike
  "Footing base": 4, // hard rock below 4'0"
  "Raft & retaining-wall RCC": 3, // school working-hour restriction
  "Basement roof slab": 2,
};

export function buildDemoData(): DataSnapshot {
  const phases: Phase[] = PHASES.map((p, i) => ({
    id: p.id,
    projectId: DEMO_PROJECT_ID,
    name: p.name,
    kind: p.kind,
    order: i,
  }));

  const activities: Activity[] = [];
  for (const p of PHASES) {
    const rows = FIXED[p.id] ?? FLOOR_SEQUENCE;
    const span = durationDays(p.start, p.end) - 1;
    let prevId: string | null = null;
    rows.forEach(([name, trade, from, to, vendorId], i) => {
      const id = `${p.id}-a${i + 1}`;
      const start = addDays(p.start, Math.round(span * from));
      const end = addDays(p.start, Math.max(Math.round(span * to), Math.round(span * from)));
      const fullName = p.kind === "floor" ? `${name} — ${p.name}` : name;
      const early = ["ph-found", "ph-base", "ph-stilt", "ph-f1"].includes(p.id);
      activities.push(
        withActuals({
          id,
          projectId: DEMO_PROJECT_ID,
          phaseId: p.id,
          name: fullName,
          trade,
          baselineStart: start,
          baselineEnd: end,
          plannedStart: start,
          plannedEnd: end,
          actualStart: null,
          actualEnd: null,
          progress: 0,
          status: "not_started",
          predecessorId: prevId,
          vendorId,
          engineerId: early ? SE : null,
          order: i,
        }, SLIPS[name] ?? 0),
      );
      prevId = id;
    });
  }

  const remarks: Remark[] = [
    remark("r1", "ph-found-a2", "delay", "JCB operators' strike — excavation halted for 5 days.", "2026-06-29T10:30:00+05:30"),
    remark("r2", "ph-found-a5", "ground", "Hard rock encountered below 4'0\". Rock breaker mobilised; footing depth under review.", "2026-07-15T16:10:00+05:30"),
    remark("r3", "ph-found-a6", "access", "Working hours restricted 8 am–3 pm near the neighbouring school; concrete pours rescheduled.", "2026-07-21T09:00:00+05:30"),
    remark("r4", "ph-stilt-a3", "note", "AAC block delivery delayed by supplier; masonry gang reduced to 6.", "2026-11-12T12:45:00+05:30"),
  ];

  return {
    version: 1,
    projects: [project],
    phases,
    activities,
    vendors,
    remarks,
    audit: [],
  };
}

/** Fill actual dates/progress as of SEED_DATE, with an optional finish slip. */
function withActuals(a: Activity, slip: number): Activity {
  if (SEED_DATE < a.plannedStart) return a;
  const actualStart = addDays(a.plannedStart, slip > 0 ? 1 : 0);
  if (addDays(a.plannedEnd, slip) < SEED_DATE) {
    return normalizeProgress(
      { ...a, actualStart, actualEnd: addDays(a.plannedEnd, slip), progress: 100 },
      SEED_DATE,
    );
  }
  // In progress: some on plan, every third one behind, so the demo shows both.
  const planned = durationDays(a.plannedStart, SEED_DATE) / durationDays(a.plannedStart, a.plannedEnd);
  const pace = a.order % 3 === 0 ? 0.7 : 1.1;
  const progress = Math.max(5, Math.min(95, Math.round(planned * 100 * pace)));
  return normalizeProgress({ ...a, actualStart, progress, status: "in_progress" }, SEED_DATE);
}

function remark(id: string, activityId: string, kind: Remark["kind"], text: string, at: string): Remark {
  return {
    id,
    activityId,
    kind,
    text,
    userId: SE,
    userName: "Site Engineer",
    at: new Date(at).toISOString(),
  };
}
