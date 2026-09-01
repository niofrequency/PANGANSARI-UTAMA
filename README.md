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

Demo mode starts as an empty shell — no seeded accounts, submissions,
warnings, or training modules. Demo-mode login only checks the email
address (**any password works**), so use the Sign Up tab to create your
first account, or add one directly in `src/data/mockData.ts`
(`INITIAL_USERS`) if you want something pre-populated on first load.

`SITES` in that same file is the one part that isn't demo content — edit
it with your real site/location list either way.

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

## How it works

Every screen in the app produces one of two kinds of record: something
that needs a human to review it, or a self-contained audit that doesn't.

**Submit → review → approve (the daily checklists)**

1. A Housekeeper or Food Safety Technician fills out their daily
   checklist and submits it. Status starts **Pending**.
2. It lands in their Supervisor's **Field Queue** — scoped to the same
   department *and* site, so a Housekeeping Supervisor never sees Food
   Safety submissions or another site's queue, and vice versa.
3. The Supervisor opens it, sees every item's answer (plus any photo),
   and **Approves** or **Rejects** (with a reason, sent back to the
   submitter).
4. Anything still Pending also shows up in that department's **Manager**
   under **Escalations** — the same queue, department + site scoped, as
   a manager-level override.
5. The **Food Safety Technician's** daily log carries one extra piece: a
   19-item Wellness / Personal Hygiene / PPE self-check, folded into the
   same submission. "Ready to Work" is computed live as they answer it;
   if anything comes back Not Good, the card shows up **red-flagged** in
   the Supervisor's Field Queue with a warning banner, before they've
   even opened it.

**Fill → submit → done (the Inspections audits)**

The three Inspections audits (see below) skip the review step entirely —
a Food Safety Supervisor, Manager, or the General Manager fills one out
and submits, and it's saved instantly as the record. No second approval,
same as the paper form it replaces.

**The General Manager and Admin sit outside this**

- **General Manager** — the one role not scoped to a single department:
  its Escalations queue pulls Pending submissions from *both*
  departments and every site.
- **Admin** — never touches a submission at all; the Admin Portal only
  manages staff accounts and role assignments.
- **Analytics Dashboard** (both kinds of Manager) — aggregates every
  submission, every site, every department into one combined score. It's
  not split by department yet, so "today's score" is one number covering
  everything.

## The Inspections system

The three audits behind the "fill → submit → done" flow above, available
under the **Inspections** tab to Food Safety Supervisors, Managers, and
the General Manager. Each is transcribed verbatim from one of PSU's own
QHSE Excel checklists:

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
