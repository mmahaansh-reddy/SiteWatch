# SiteWatch

**SiteWatch** is a site & construction management web app. Front-end implementation of the **Site & Construction Management Platform PRD v1.1**
(Foxsense Innovations – Founder's Office, 24 Jul 2026).
Reference project: *Proposed Commercial Building for M/S. Foxsense, Vellanaipatti Road, Coimbatore.*

> **Status:** T0 ✅ · T1 ✅ · Role-based access ✅ · **Data entry live** (T2–T4 core + T6 Schedule + Vendors) → T7 next.
> **Delivery target:** feature-complete front-end in **2 weeks** (by ~03 Dec 2026), deployed on Vercel.

---

## 1. What this release is (and isn't)

| | This release (V1-local) | Later (V1-production) |
|---|---|---|
| UI | Next.js web app, responsive: **PM dashboard** + **mobile-friendly site views** | Same UI, unchanged |
| Data | Stored **in the browser** (no server DB) | Postgres + API, swapped in behind the same data layer |
| Users | Role switcher (pick a user/role), no real login | Real auth, server-enforced roles |
| Sharing data between people | ❌ Each browser has its own copy (JSON export/import as stopgap) | ✅ Shared |
| Notifications | In-app notification centre | Push / email / WhatsApp |

**Important limitation:** with browser storage, a site engineer's updates on their phone are *not visible*
to the PM on their laptop. This release is therefore a **working, demo-able and testable product**,
not yet a multi-user production system. Everything is built so the database can be added later
**without rewriting the UI** (see §3.3).

---

## 2. Tech stack decisions

| Area | Decision | Why |
|---|---|---|
| Framework | **Next.js** (latest stable, App Router) + **TypeScript (strict)** | Requested; Vercel-native |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) + `lucide-react` icons | Requested; accessible components we own in-repo |
| Browser storage | **IndexedDB** via a small built-in adapter + zustand `persist` (Dexie deferred) | `localStorage` caps at ~5 MB and can't hold photos/PDFs. IndexedDB is still local browser storage, holds blobs, and is async. A tiny `localStorage` key holds only UI prefs (current user, project, theme). |
| Validation | **Zod** schemas for every entity | One source of truth for types + form validation + future API contracts |
| Forms | `react-hook-form` + Zod resolver | Low-typing, validated forms |
| Data reads | `dexie-react-hooks` (`useLiveQuery`) | Reactive UI on local data, no extra state library |
| UI state | **Zustand** (session: current user/project, filters) | Small, simple |
| Tables | **TanStack Table** + `@tanstack/react-virtual` | Sorting/filtering; smooth with hundreds of rows (NFR-2) |
| Gantt | **Custom-built** (CSS grid + SVG, virtualised) | Full control over phase grouping, vendor colours, baseline vs actual, delay flags; avoids heavy/unmaintained libs |
| Charts | shadcn **Charts** (Recharts) | Matches design system |
| Dates | `date-fns`; display `DD-MMM-YY` (as in the PRD/schedule) | |
| Money | Stored as **integer paise**; shown as ₹ with Indian grouping (₹12,34,567) | No floating-point errors |
| Exports | Excel: `exceljs`; PDF: print-optimised routes (`window.print`) | No server needed |
| Sharing (DPR) | PDF download + **WhatsApp share link** (`wa.me` with summary text) + `mailto:` | FR-6.2 without a backend |
| Offline / install | PWA manifest + service worker (Serwist) | App opens with no signal; data is already local |
| Testing | **Vitest** (domain logic) + **Playwright** (smoke flows) | |
| Quality | ESLint, Prettier, `tsc --noEmit` in CI | |
| Hosting | **Vercel** (details to be provided by owner) | Requested |

---

## 3. Architecture

### 3.1 Folder layout
```
src/
  app/
    (dashboard)/          # PM / Admin web views (sidebar layout)
      dashboard/ schedule/ gantt/ budget/ vendors/ materials/
      diary/ equipment/ change-orders/ documents/ payments/
      warranty/ reports/ notifications/ admin/
    (site)/site/          # Mobile-first views for Site Engineer / Contractor
    print/                # Print-optimised report pages (PDF export)
  components/ui/          # shadcn components
  components/<module>/    # Feature components
  domain/                 # Pure TS: schemas, calculations, rules (no React)
    schemas/  calc/  rules/  permissions.ts
  data/
    db.ts                 # Dexie database + migrations
    repositories/         # One repo per entity (the only code that touches storage)
    audit.ts              # Audit + change-history writer
    seed/                 # Foxsense reference project seed data
    backup.ts             # Full JSON export / import
  lib/                    # formatters (₹, dates), utils
  stores/                 # Zustand session store
```

### 3.2 Layering rules
1. **UI → repositories → Dexie.** Components never touch IndexedDB directly.
2. **All business logic lives in `src/domain/`** as pure functions (variance, budget rollups,
   milestone triggers, alerts). Unit-tested, and reusable on a server later.
3. **Every write goes through the repository**, which (a) validates with Zod, (b) checks
   permissions, (c) writes an **audit entry** with field-level old→new values (FR-1.10, FR-8.3, NFR-8).

### 3.3 Path to a real database
Repositories implement a common interface (`list / get / create / update / remove`).
Moving to production = add an `ApiRepository` implementation backed by a server (e.g. Postgres via
Supabase/Neon + Next.js route handlers) and switch one config flag. Schemas, rules, permissions
and UI stay as they are.

### 3.4 Roles & permissions
`domain/permissions.ts` encodes PRD §6 as a single matrix: `can(user, action, module, record?)`.
Used to hide/disable UI *and* re-checked inside repositories. "Own" scope (e.g. a contractor sees only
their own activities/payments) is resolved via the user's vendor / assignment links.

### 3.5 Key domain rules (from the PRD)
- **Delay flag (FR-1.5):** delayed if `actualEnd` or *projected end* > `plannedEnd`.
  Projected end = actual start + planned duration ÷ (progress rate), floored at today.
- **Soft dependencies (FR-1.9):** predecessor conflicts show a warning, never block a save.
- **Floor template (FR-1.3):** clone a phase's activity sequence to another floor with a date offset
  and relinked predecessors.
- **Baseline vs current (FR-12.4):** activities and BOQ lines keep immutable **baseline** fields;
  approved change orders adjust **current** fields only. Variance reports show both
  "vs baseline" and "vs current".
- **Payment milestones (FR-14):** status auto-moves *Not Due → Due* when the linked phase/activity
  reaches 100 %; projected due date uses the schedule projection (FR-14.4).
- **Thresholds (FR-2.5, 6.3, 7.2, 13.3):** budget %, critical-delay days, and permit-expiry lead time
  are per-project settings (defaults: 90 %, 3 days, 30 days).

---

## 4. Development plan (one task at a time)

Each task is small, self-contained, ends in a working app, and is committed separately.
"Must" requirements are prioritised; "Could" items are done only if time remains.

| # | Task | PRD coverage | Done when |
|---|---|---|---|
| **T0** | Plan + decisions (this README) | — | ✅ Done |
| **T1** | Scaffold: Next.js + TS strict + Tailwind + shadcn/ui, lint/format, app shell (sidebar, top bar, project & user switcher, light/dark) | — | ✅ Written · build pending |
| **T2** | Domain schemas (Zod) for all 18 entities in PRD §5 + formatters (₹, dates) | §5 | ✅ Core entities (project, phase, activity, vendor, remark, audit) · rest added per module |
| **T3** | Data layer: Dexie DB, repositories, audit/change-history, JSON backup/restore, "reset demo data" | FR-1.10, 8.3, NFR-6, NFR-8 | ✅ IndexedDB store, audit trail, JSON backup/restore, demo reset, clear |
| **T4** | Seed data: Foxsense project, phases (Appendix A), activities, vendors, materials, sample BOQ | §8 | ✅ 9 phases, 66 activities, 7 vendors, 4 exception remarks |
| **T5** | Users, roles, permissions matrix, multi-project switching, admin user screen | FR-8.1–8.2, NFR-4 | Permissions ✅ done early · user CRUD + audit viewer pending |
| **T6** | Schedule: phases & activities CRUD, floor-template cloning, soft predecessor warnings, remarks | FR-1.1–1.3, 1.6, 1.9 | ✅ Done |
| **T7** | Site (mobile) view: my current/upcoming activities, update dates/%/remarks, photo capture | FR-1.4, 1.8, 9.1, 9.3, NFR-7 | ◐ Progress updates + remarks live in site view; photos pending |
| **T8** | Gantt: phase grouping, planned vs actual bars, delay flags, vendor ownership, filters, change history | FR-1.5, 1.7, 4.5 | 300+ activities render smoothly |
| **T9** | Vendors, work orders, BOQ, invoices + approval workflow, budget vs actual rollups | FR-2.1–2.4, 4.1–4.3 | ◐ Vendor master (FR-4.1) done; BOQ/invoices pending |
| **T10** | Payment milestones (phase-linked, auto-Due, early/late reasons), upcoming-payments view, budget threshold alerts | FR-2.5–2.6, 14.1–14.5 | Completing a phase flips milestone to Due |
| **T11** | Materials: master, indents + approval, receipts (with challan photo), consumption, low-stock | FR-3.1–3.7 | Stock updates on receipt/consumption |
| **T12** | Site diary (auto-filled from day's updates), labour by trade, equipment register + usage/idle + cost | FR-5.1, 10.1–10.5, 11.1–11.5 | Missing-diary days flagged |
| **T13** | Change orders: lifecycle, cost/schedule impact, baseline retention, cumulative log | FR-12.1–12.5 | Baseline untouched after approval |
| **T14** | Documents & permits archive: register, uploads with versions, vendor tags, search, expiry reminders | FR-9.2, 13.1–13.5 | Re-upload keeps old versions |
| **T15** | Warranty / DLP: items, status, response time, DLP expiry per trade, retention link, summary | FR-15.1–15.5 | DLP expiry alerts appear |
| **T16** | Dashboard KPIs + reports: DPR (PDF/WhatsApp/email), critical delays, floor/trade comparison, labour trend, Excel/PDF exports | FR-2.7, 5.2, 6.1–6.5 | DPR exports as PDF |
| **T17** | Notification centre + per-project thresholds/recipients | FR-7.1–7.2 | All 5 alert types generated |
| **T18** | PWA/offline install, accessibility, performance, error boundaries, empty states | NFR-1, 2, 5, 7 | Lighthouse ≥ 90 (PWA, a11y) |
| **T19** | Test pass (Vitest + Playwright smoke), QA against every "Must" FR | all | Checklist green |
| **T20** | Vercel deployment + handover notes | — | Live URL |

### Indicative 2-week schedule
| Days | Tasks |
|---|---|
| 1 | T1, T2 |
| 2 | T3, T4 |
| 3 | T5, T6 |
| 4 | T7 |
| 5 | T8 |
| 6 | T9 |
| 7 | T10, T11 |
| 8 | T12 |
| 9 | T13, T14 |
| 10 | T15, T16 |
| 11 | T16 (cont.), T17 |
| 12 | T18 |
| 13 | T19 |
| 14 | T20 + buffer |

---

## 5. After this release: making it production-ready

1. **Backend & DB** — Postgres (Supabase or Neon) + API routes; `ApiRepository` swap (§3.3).
2. **Auth** — real login (email OTP / phone OTP for site staff), server-side permission checks.
3. **File storage** — S3/R2/Supabase Storage for photos, drawings and certificates.
4. **Offline sync** — local-first writes queued in IndexedDB and synced to the server with conflict rules
   (last-write-wins per field + audit trail).
5. **Notifications** — web push, email (e.g. Resend), WhatsApp Business API.
6. **Ops** — automated backups, monitoring (Sentry), rate limiting, encrypted storage at rest (NFR-3, NFR-6).
7. **Native app (optional)** — wrap/port site views with Expo if PWA camera/background upload proves limiting on iOS.

---

## 6. Working agreements

- Work proceeds **one task at a time**; each task is reported back before the next starts.
- Each task is kept small so the working context stays well within limits.
- Model choice is controlled by the owner in the model picker (Claude can't switch its own model).
  Plan: Opus for T1–T17 (architecture/logic), Sonnet acceptable for UI-polish tasks (T18).

---

## 7. Open questions

| # | Question | Default if no answer |
|---|---|---|
| Q1 | Can you share the **actual program schedule** (79 activities, spreadsheet)? The PRD only has the phase summary. | Generate realistic activities from Appendix A |
| Q2 | Real **vendor list, BOQ and material list**, or sample data? | Realistic sample data, clearly marked |
| Q3 | OK to use **IndexedDB** (still in-browser) instead of strict `localStorage`? | IndexedDB |
| Q4 | Vercel: deploy via a **GitHub repo** (preferred) or the Vercel CLI with a token? | GitHub repo |
| Q5 | Any **branding** (logo, colours)? | Neutral theme with an accent colour |
| Q6 | Default **retention %** and **DLP periods** per trade? | 5 % retention; 12-month DLP |
| Q7 | Site diary **weather**: manual pick-list or auto-fetched? | Manual pick-list (no API needed) |
| Q8 | Should **Admin** also be able to approve (indents, invoices, change orders, payments)? | No — PM only |

---

## 8. Getting started

```bash
npm install
npm run dev        # http://localhost:3000  → redirects to /dashboard
npm run build      # production build
npm run typecheck && npm run lint
```
Requires Node ≥ 20.9. Pages: `/dashboard` (PM/Admin), `/site` (mobile view for site staff);
every other sidebar module shows an "Under construction" placeholder until its task ships.

> ⚠️ T1 was written in an environment without package-registry access, so it has been
> syntax-checked but **not yet installed or built**. The first `npm install && npm run build`
> (locally or on Vercel) is the verification step; dependency versions are caret ranges and
> `package-lock.json` will be generated on that first install.

---

## 9. Adding data (what works now)

| Where | Who | What you can do |
|---|---|---|
| **Activities** (`/schedule`) | PM, Admin | Add/rename/delete phases; add/edit/delete activities (dates, trade, vendor, engineer, predecessor, actuals, %); **Copy floor** template to another phase with a date shift; remarks |
| | Site Engineer, Contractor | See own activities; **Update** actual dates & % complete; add remarks |
| **Vendors** (`/vendors`) | PM, Admin | Add/edit/delete vendors (trade, contact, contract value ₹, terms) |
| **Site view** (`/site`) | Everyone | "My activities": current + next 14 days, tap to update progress, remarks |
| **Dashboard** | PM, Admin | Live overall %, days behind/ahead, phase progress, critical delays; data tools |
| **Data tools** (Dashboard / Admin) | PM, Admin | Download backup · Restore backup · Load demo data · Clear all data · recent changes (audit) |

Rules enforced on every save: PRD §6 permissions (site roles can only change actual dates and % on
their own activities), validation (dates, 0–100 %), soft predecessor warnings (never block),
baseline dates kept when plans change, 100 % ⇔ completed with an actual end date, audit entry per change.

Data lives in this browser's IndexedDB (`sitewatch` database). First visit loads the Foxsense demo data.

## 10. Role-based access (how it works)

The PRD §6 matrix lives in **`src/domain/permissions.ts`** — the single source of truth.

| Role | Lands on | Sees (web) | Can update |
|---|---|---|---|
| **Founder's Office / PM** | `/dashboard` | Everything except User Management | Full on all modules; **only role that approves** (budget/invoices, indents, change orders, payments) |
| **Admin** | `/dashboard` | Everything incl. Users & Audit | Full record access everywhere; manages users; does not approve |
| **Site Engineer** | `/site` | Activities, Gantt, Diary, Budget (view), Vendors (assigned), Materials, Equipment, Warranty, Documents, Reports (own DPR) | Own activities, own diary entries, indents, material receipts, equipment usage, warranty items |
| **Contractor** | `/site` | Own activities, Diary (view), own trade's budget, own vendor record, Materials, Change Orders (own), own payments, own warranty items, own documents, own DPR | Own activities, indents, change-order requests, responses to own warranty items |

Building blocks:
- `can(role, module, action)` / `canOnRecord(…, isOwn)` — scope is `all` or `own`.
- `<RequireAccess module>` — page guard (shows "No access" instead of the page).
- `<Can module action isOwn>` — show/hide a button or form.
- `usePermissions()` — hook bound to the current user.
- Sidebar is filtered per role; switching user jumps to that role's home page.
- `/admin` renders the live matrix, generated from the policy.

## 11. Decision log

| Date | Decision | Reason |
|---|---|---|
| 19-Nov-26 | Product named **SiteWatch** | Owner decision |
| 19-Nov-26 | Next.js + Tailwind + shadcn/ui; browser storage for now; Vercel hosting | Owner decision |
| 19-Nov-26 | IndexedDB (Dexie) for project data; `localStorage` only for session prefs (`sitewatch.session`) | 5 MB `localStorage` cap; photos/PDFs need blob storage |
| 19-Nov-26 | Two surfaces in one app: `(dashboard)` route group with sidebar, `(site)` route group mobile-first | PRD §2.1 — PM web vs site mobile |
| 19-Nov-26 | Modules not yet built resolve through one `[module]` placeholder route driven by `src/lib/nav.ts`; real modules add static folders that take precedence | Whole navigation is clickable from day 1 without dead links |
| 19-Nov-26 | Theme: neutral base + safety-orange primary, light/dark via `next-themes` | Construction context; readable outdoors |
| 19-Nov-26 | Temporary demo users/projects in `src/lib/demo-identities.ts` (role switcher instead of login) | Replaced by seeded data in T4 and RBAC in T5 |
| 19-Nov-26 | `button` has a `touch` size (h-12) for site screens | NFR-7 large touch targets |
| 19-Nov-26 | TypeScript `strict` + `noUncheckedIndexedAccess` | Catch missing-data bugs early |
| 19-Nov-26 | Permissions as actions × scope (`view/create/edit/delete/approve/request/log/respond` × `all/own`) | Expresses every PRD §6 cell exactly (e.g. "Raise indent, log receipt") |
| 19-Nov-26 | **Approvals are PM-only**; Admin "Full" excludes approve | PRD §2.2 — PM "approves indents and payments"; Admin configures. *Open question Q8* |
| 19-Nov-26 | PM can maintain the material master (create/edit) as well as approve | FR-3.1 lists Admin and PM |
| 19-Nov-26 | Role-dependent UI renders only after hydration (skeleton first) | Server HTML can't know the browser-stored user; avoids flashing the wrong menu |
| 19-Nov-26 | **zustand + hand-written IndexedDB adapter instead of Dexie** for now | No package downloads in the dev environment; zero new dependencies; same storage (IndexedDB). Dexie can replace it behind `src/data/` later |
| 19-Nov-26 | All writes go through pure functions in `src/data/ops.ts` (permission check → validate → normalise → audit) | One tested path; identical rules can run on a server later |
| 19-Nov-26 | Site roles editing "own activities" may change only actual start/end and % (FR-1.4) | Plans, vendors and names stay under PM control |
| 19-Nov-26 | Native `<select>` and `<input type="date">` in forms | Fastest, most familiar controls on phones (NFR-7); no extra dependencies |
| 19-Nov-26 | Demo "today" for seeded actuals is 19-Nov-26; delays are computed against the real current date | Demo data stays realistic as time passes |
