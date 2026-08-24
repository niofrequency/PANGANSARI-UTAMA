# PSU FieldOps

A mobile-first, installable web app for **Pangansari Utama (PSU) — Food
Resources Solutions**: role-based checklists, photo-verified work orders,
approvals, and a full QHSE inspection system for Housekeeping and Food
Safety teams, plus a site-wide management view, an admin portal, and an
analytics dashboard.

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

By default this runs in **demo mode** — no backend required, data is
stored in your browser's `localStorage`. Good for trying things out.

### Logging in (demo mode)

Demo-mode login only checks the email address — **any password works**.
Two crews are seeded out of the box:

- A small **fictional demo crew** (`dewi.manager@psu.demo`,
  `hendra.supervisor@psu.demo`, `made.technician@psu.demo`, etc.) with a
  few days of sample submission history already in place, so every screen
  has something to look at on first load.
- The **real PSU staff roster**, seeded as accounts only (no invented
  work history under real names) — see `src/data/mockData.ts` for the
  full list, or use `DEMO_PASSWORD` exported from that file if you want
  one consistent password to hand out.

Add, remove, or edit any of these directly in `src/data/mockData.ts` —
see the comments at the top of that file (`SITES`, `INITIAL_USERS`).

## Deploying for real use (Vercel + Firebase)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com) — it's a standard Vite app, Vercel will detect it automatically.
2. Follow **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** to create a Firebase project, enable Auth + Firestore, and add your keys as Vercel environment variables.
3. Redeploy. The app automatically switches from demo mode to real accounts/roles once the Firebase env vars are present — no code changes needed. (`mockData.ts` seed data has no effect once Firebase is configured.)

## Roles

Two departments (Housekeeping, Food Safety), each with a Manager,
Supervisor, and frontline role, plus one site-wide role that sits above
both, and a locked-down Admin:

| Role | What they do |
|---|---|
| **Housekeeper** | Fills the daily room checklist, uploads a timestamped photo per item. |
| **Housekeeping Supervisor** | Field Queue — reviews and approves/rejects Housekeeping submissions for their site. |
| **Housekeeping Manager** | Escalations (a manager-level override queue) + the Analytics Dashboard. |
| **Food Safety Technician** | Daily log (fridge/core temps, area clean) plus a 19-item Wellness / Personal Hygiene / PPE self-check with a live computed "Ready to Work" status. |
| **Food Safety Supervisor** | Field Queue for Food Safety submissions, can issue a warning to a technician, and has the **Inspections** tab (see below). |
| **Food Safety Manager** | Escalations, the Dashboard, and the same Inspections tab as the Supervisor. |
| **General Manager** | Site-wide leadership (GM, Deputy GM, HR & GA, COC, etc.) — sees *both* departments' Escalations queues with no site filter, plus Inspections. Not scoped to one department like the two Managers above. |
| **Admin** | One locked account (`SUPER_ADMIN_EMAIL` in `src/services/authService.ts`) — manages staff accounts and role assignments. Not part of either department. |

A Housekeeping Supervisor/Manager and a Food Safety Supervisor/Manager
only ever see their own department's submissions — the General Manager
role is the deliberate exception.

## The Inspections system

Three audits, transcribed verbatim from PSU's own QHSE Excel checklists,
available to Food Safety Supervisors, Managers, and the General Manager
under the **Inspections** tab. Each is a self-contained record — no
second reviewer signs off, it's saved as Approved the moment it's
submitted:

| Audit | Structure | Scoring |
|---|---|---|
| **Food Safety Inspection Checklist** | 169 items across 18 categories | A/B/C/N-A per item → PSU category A–D |
| **GEMBA Walk** | 59 items across 2 sections, plus the source's 7-step "3 in a Row" coaching reference | Conform / Not Conform / Non Observed / N/A → exact compliance % (recovered from the source workbook's own formula) |
| **Daily Food Handler Assessment** | 19 checks (Wellness / Personal Hygiene / PPE) × a crew roster | Fill-in-the-blank "v"/"x" per the source's own convention → Ready to Work |

Source data and scoring logic live in `src/data/` (e.g.
`inspectionChecklistData.ts` + `inspectionScoring.ts`), each with a code
comment on which parts are read verbatim from the workbook versus this
app's own scoring assumptions where the source formula wasn't
recoverable.

## Project structure

```
src/
  App.tsx                Role-based routing — which portal each role sees
  components/
    Portals/              One screen per role (Housekeeper, Supervisor,
                           Manager, Technician — Manager also covers
                           General Manager)
    Inspections/           The 3 audit forms + report views + the shared
                           Inspections tab/history
    Admin/                 Admin Portal (user/role management)
    Dashboard/             Analytics dashboard
    Auth.tsx, Layout.tsx, PhotoCapture.tsx, InstallGuide.tsx, ...
  i18n/                    English/Bahasa Indonesia translations + toggle
  data/
    mockData.ts            Seed data used in demo mode — sites, users,
                            submissions, trainings, warnings
    inspectionChecklistData.ts / inspectionScoring.ts    FSI audit
    gembaWalkData.ts / gembaWalkScoring.ts                GEMBA Walk
    dailyFoodHandlerData.ts / dailyFoodHandlerScoring.ts  DFH assessment
  lib/firebase.ts          Firebase init (reads env vars, no-ops if absent)
  services/                Firebase Auth + Firestore data access
  store/useAppStore.ts     Central app state — branches between Firebase
                           mode and localStorage demo mode
  types.ts                 Shared types — UserRole, Submission, etc.
public/
  manifest.json, sw.js, icons/  PWA install support
functions/                 Firebase Cloud Functions (staff account creation)
firestore.rules            Firestore security rules (deploy via Firebase CLI)
```

## Key features

- **Installable**: works as a normal website, but installs to the home
  screen on Android/iPhone and as a desktop app on Windows/Mac via the
  in-app "Install App" guide.
- **Bilingual**: full English/Bahasa Indonesia toggle, including every
  checklist item's text — not just button labels.
- **Multi-site**: submissions, the Field Queue/Escalations, and the
  Dashboard's by-site breakdown are all site-scoped (`src/data/mockData.ts`
  → `SITES`), so more than one physical location is a first-class case.
- **Role-based portals**: see the [Roles](#roles) table above.
- **Admin-managed roles**: only the designated admin account can assign
  staff roles — enforced both client-side and in Firestore security rules.
- **Verbatim source checklists**: the Inspections audits are transcribed
  from PSU's real Excel checklists, not reinvented — see
  [The Inspections system](#the-inspections-system).
