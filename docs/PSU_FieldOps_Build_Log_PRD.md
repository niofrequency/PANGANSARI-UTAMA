# PSU FieldOps — Build Log & Current-State PRD

**Product:** PSU FieldOps (PT Pangansari Utama) — field operations app for checklists, sign-offs, issue reports, chat and staff management across PSU's work locations.
**Repo:** `niofrequency/PANGANSARI-UTAMA` · **Live:** https://pangansari-utama.vercel.app · **Firebase project:** `pangansari-utama`
**Covers:** the work merged in PRs #79 – #97 (13 – 16 November 2026), plus the state of the system a follow-up session needs to know about.
**Workstreams so far:** features & roles (#79–#91), storage, monitoring & reporting (#93–#96, see §9.2a), chain of command for logs (#97, see §3.3), paper-form review with stamps and e-signatures (#99 – #100, see §3.4).
**Last updated:** 16 November 2026.

---

## 1. Stack at a glance

| Layer | What | Where |
|---|---|---|
| Web app | React 19 + Vite + Tailwind 4, PWA (service worker `public/sw.js`) | `src/`, deployed by **Vercel** from `main` |
| Auth | Firebase Auth (email/password, Google, custom tokens for Staff ID) | `src/services/authService.ts` |
| Database | Cloud Firestore (default DB), **no persistent local cache** | `src/lib/firebase.ts`, `src/services/*Service.ts` |
| Photos | **Firebase Storage** (new uploads since #93, 1024 px WebP) · Cloudinary (photos uploaded before #93 keep working) | `storage.rules`, `src/services/cloudinaryPhotoService.ts` |
| Server | Cloud Functions, **Node.js 22**, `us-central1` | `functions/src/index.ts` |
| Push | Firebase Cloud Messaging (web push) | `src/lib/pushNotifications.ts`, `public/sw.js` |
| Offline | Dexie (IndexedDB) outbox for submissions | `src/lib/outboxDb.ts` |
| CI | GitHub Actions deploys Functions + Firestore/Storage rules on push to `main` | `.github/workflows/deploy-functions.yml` |
| Demo mode | No Firebase env vars → everything in `localStorage` | `src/store/useAppStore.ts` |

State lives in one hook, `useAppStore` (`src/store/useAppStore.ts`): live Firestore subscriptions in Firebase mode, `localStorage` in demo mode.

---

## 2. Roles and locations (current model)

### 2.1 Roles (`UserRole`, `src/types.ts`)

| Level | Housekeeping | Food Safety | Portal |
|---|---|---|---|
| Admin | `ADMIN` (everything, every site) | | `Admin/AdminPortal.tsx` |
| General Manager | `GENERAL_MANAGER` (both departments, all sites) | | `Portals/ManagerPortal.tsx` |
| Manager | `HOUSEKEEPING_MANAGER` | `FOOD_SAFETY_MANAGER` | `Portals/ManagerPortal.tsx` |
| Supervisor | `HOUSEKEEPING_SUPERVISOR` | `FOOD_SAFETY_SUPERVISOR` | `Portals/SupervisorPortal.tsx` |
| **Leadhand** (new) | `HOUSEKEEPING_LEADHAND` | `FOOD_SAFETY_LEADHAND` | `SupervisorPortal` (Checked-by only; no Inspections / Actions / Warnings) |
| Frontline | `HOUSEKEEPER` (Room Cleaning), `HOUSEKEEPING_JANITOR` (Restroom), `HOUSEKEEPING_LAUNDRY` (Laundryshop) | `FOOD_SAFETY_TECHNICIAN` (kitchen staff) | Technician / Housekeeper / Janitor / LaundryStaff portals |

Sign-off chain per form: `SIGNOFF_CHAINS` in `src/data/opsLogsCatalog.ts` — frontline fills → Leadhand/Supervisor **Checked by** → Manager **Approved / Verified by**. Since #97 **every chain ends with a Manager step**:

| Form | Chain |
|---|---|
| Temperature Control (UF.10000), Dishwashing (UN.00.51), Restroom (UN.00.45) | Checked → **Approved** (Approved added in #97) |
| Cooking & Service, Hot Packed Meal, Laundryshop, Technician daily log, Room Cleaning | Checked → Approved |
| Mess Hall Hygiene | Checked → Approved → Verified |
| Thawing | Checked → Verified |
| Staff Ready (filed by a Supervisor) | Approved → Verified |
| Gemba Walk (filed by a Supervisor) | Approved |

Chain of command (rank) for returning and deleting logs: Admin 6 › General Manager 5 › Manager 4 › Supervisor 3 › Leadhand 2 › Frontline 1 (`src/lib/submissionAuthority.ts`, mirrored in `firestore.rules`).

### 2.2 Locations (`SITES`, `src/data/mockData.ts`)
- **51 real work locations** from the HR list (LOKASI KERJA), each with `area` (Townsite, 32, 38, 66, 68, 72, 74, PS, BC, KK, HL, LL, GRS, Hotel) and `kind` (kitchen, camp, laundry, cleaning, hotel, sport, warehouse, maintenance, library, office, other).
- Six pre-existing site ids were kept so old data stays attached (`site-townsite`, `site-campservices`, `site-lupalelah`, `site-melatibakery`, `site-melatimess`, `site-mawarmess`).
- **Legacy placeholders still present:** `site-1` "Main Site" and `site-spcs` "SPCS" — neither is a real location (see §8).
- Site pickers are grouped by area via `src/components/SiteOptions.tsx`.
- Site Access (`assignedSites`, `src/lib/siteScope.ts`): unset = own location only, `'ALL'`, or a list.

---

## 3. Features delivered (PR by PR)

| PR | Feature | Key files |
|---|---|---|
| #79 | **Mobile logout fix** (cached "profile missing" snapshot / transient listener error no longer signs people out; re-attach on tab resume; Staff-ID fallback sessions persisted). **Manager "Users" tab** (manage non-admin accounts). | `authService.ts` (`watchAuthAndProfile`), `useAppStore.ts`, `Admin/UserManagementPanel.tsx`, `firestore.rules` (`isManager`) |
| #80 | **Paper-replica print sheets** for every Ops Log form (PSU logo, document-control box, paper grid). Forms now also save raw readings in `meta` (`cookingRows`, `hotPackRows`, `thawRows`, `staffReadyRows`). **Functions → Node 22.** | `components/OpsLogs/print/*`, `paperShared.tsx` |
| #81–#82 | CI: `--force` for Artifact Registry cleanup policy; **rules deploy added to the workflow**. | `.github/workflows/deploy-functions.yml` |
| #83 | **Per-form "Print form" button** for every role (replaced the generic header Print). Sheet is portalled outside `#root` while printing. | `OpsLogs/print/PaperPrintButton.tsx` |
| #84 | **In-app chat** (role-scoped) + **Managers see wrench-icon issue reports**. | `Chat/ChatTab.tsx`, `lib/chatPolicy.ts`, `services/chatService.ts`, `firestore.rules` (`messages`) |
| #85 | Chat: **Admins talk to everyone**; **Technicians only with their location's Supervisor** (home-site match, both directions). | `chatPolicy.ts`, `firestore.rules` (`canChatUsers`, `chatTechSiteOk`) |
| #86 | **Push notifications** (FCM) + unread badges (tab icon, header icon, app icon). | `lib/pushNotifications.ts`, `public/sw.js`, function `notifyChatMessage`, `firestore.rules` (`pushTokens`) |
| #87 | Chat: **edit / delete for everyone / delete for me / clear chat**. | `ChatTab.tsx`, `chatService.ts`, `firestore.rules` |
| #88 | Chat: **15-minute edit window** (server-set `sentAt`). | `chatPolicy.ts`, `firestore.rules` |
| #89 | **51 locations as sites** + **Leadhand roles**. | `mockData.ts`, `SiteOptions.tsx`, `types.ts` |
| #90 | **Bulk staff import** from the HR employee list (Admin → Import). Staff ID + password login for imported accounts. | `Admin/ImportStaffPanel.tsx`, `lib/employeeImport.ts`, `lib/spreadsheetReader.ts`, function `bulkImportStaff`, `StaffIdGate.tsx` |
| #91 | **Personnel**: two-column cards, filter by location/role, sort, Staff ID search, "Show more" paging, **possible-duplicates** finder. | `Admin/UserManagementPanel.tsx` |
| #92 | This document. | `docs/PSU_FieldOps_Build_Log_PRD.md` |
| #93 | **Storage & speed**: submissions scoped to the last 60 days + PENDING + the user's sites ("Load older records" on demand); persistent Firestore cache (cleared on logout); daily/weekly Firestore backups; new photos to Firebase Storage at 1024 px WebP. Details §9.2a. | `services/submissionsService.ts`, `LoadOlderHistory.tsx`, `firestore.indexes.json`, `lib/firebase.ts` |
| #93 | **Missed-check alerts**: check schedules per site/asset (Admin/Manager → Checks); `checkMissedChecks` runs every 30 min, records misses and pushes alerts to the site's supervisors, leadhands and managers. Also fixed forms saving before-09:00 WIT entries on the previous day (UTC date bug). | `functions/src/missedChecks.ts`, `checkSchedules` / `missedChecks` |
| #93 | **Export to Excel/CSV** for any date range (Admin → Activity, Manager/Supervisor History): Submissions + Answers sheets. | `Export/ExportPanel.tsx`, `lib/xlsxWriter.ts` |
| #93 | **Automated security-rules tests** (`npm run test:rules`, Firestore emulator); run on PRs touching rules and before every rules deploy. | `tests/rules/firestore.rules.test.mjs`, `.github/workflows/rules-tests.yml` |
| #94 | **Monitoring**: app + server errors reported to `appErrors`; hourly `errorDigest` groups them, alerts Admins and deletes reports older than 30 days; Admin → Analytics "App health". **Trend analytics**: problem rate and missed checks by site and month (3/6/12 months). | `functions/src/monitoring.ts`, `lib/problemRate.ts` |
| #95 | Install banner hides itself after one minute. | `PWAInstallPrompt.tsx` |
| #96 | **Print form fills in what's been entered** on the audit forms too (Food Safety Inspection, Gemba Walk, Daily Food Handler); Room Cleaning sheet prints Y / T / blank correctly; the Technician log no longer prints "false". | `Inspections/*`, `OpsLogs/print/*` |
| #97 | **Chain of command for logs**: every chain ends with a Manager step; Supervisor and above can **Return for correction** (any status) and **delete** logs of people ranked below them; "Sent back — waiting for fix" list; filer can "Fixed — send back for review"; a log opens as a **full page** (not a popup) with Back / browser Back. See §3.3. | `OpsLogs/SubmissionDetailPage.tsx`, `lib/submissionAuthority.ts`, `OpsLogsTab.tsx`, `Admin/AdminPortal.tsx`, `firestore.rules` |
| #99 | **Review on the paper form**: the review page shows the filled-in PSU paper sheet (the Print layout) instead of answer cards, for every form, at every level. See §3.4. | `OpsLogs/SubmissionDetailPage.tsx` |
| #100 | **Stamps, e-signatures and a better viewer**: a rubber stamp (step, job title, name, date) on the sheet's signature line for every reviewer; optional e-signature when stamping; zoom / pinch / full-screen / rotate viewer for phone and desktop. See §3.4. | `OpsLogs/PaperViewer.tsx`, `OpsLogs/SignatureStampDialog.tsx`, `OpsLogs/print/*`, `store/useAppStore.ts` |

### 3.1 Chat rules (summary)
- Admin ↔ everyone. Manager ↔ Supervisor/Leadhand, Manager. Supervisor/Leadhand ↔ Manager, Supervisor/Leadhand, frontline. Frontline ↔ Supervisor/Leadhand only.
- Same department except GM/Admin. Food Safety Technicians only with a Supervisor/Leadhand whose **home site** is one of the Technician's sites.
- One Firestore doc per message; `participants: [from, to]`; recipient sets `read`; sender may edit within 15 min (server `sentAt`) or delete for everyone (text blanked); either side can hide (`hiddenFor`).

### 3.2 Bulk import (how it behaves)
- Accepts `.xlsx` / `.csv` (old `.xls` → "Save As .xlsx" message). Finds the `NO. ID / NAMA / LOKASI KERJA / JABATAN` table.
- Role = job title + location kind (`roleFor()` in `employeeImport.ts`). Unmapped jobs are skipped and listed.
- `bulkImportStaff` (admin only, ≤100 rows/call): synthetic email `<id>@staff.psu.local`, random 8-char password, writes `users/{email}` + `staffCodes/{ID}` **before** creating the Auth user, sets `requirePassword: true`. Existing IDs are skipped → re-runs are safe. Passwords returned once → CSV download.
- Result of the 5 Nov 2026 list: **1,589 rows → 1,381 imported, 208 skipped** (no matching role). Import was run successfully in production.

### 3.3 Chain of command for logs (how it behaves, #97)
- **Who:** a Supervisor, Manager, General Manager or Admin, on a log filed by someone ranked **below** them, in their **own department** (Admin and GM: both) and within their site access. Peers and Leadhands can't. Enforced in `firestore.rules` (`outranksSubmitter()`); site access is checked in the app only.
- **Review:** the log opens as its own page showing everything the filer entered (readings, Pass/Fail, remarks, photos, who / where / when, sign-off progress, the "not fit to work" warning) plus **Print**. The next reviewer in the chain gets **Stamp** / **Reject**.
- **Return for correction:** works from any status, even APPROVED, and needs a note. Sets `status: REJECTED`, `rejectionReason`, `meta.returned = { name, role, at, note, fromStatus }` and clears every sign-off stamp except `draftedBy`, so after the fix the log climbs the **whole chain again**.
- **Resolve:** the filer sees the note (and the notification bell) and either uses **Edit & resubmit** (Restroom, Laundryshop and the frontline portals' own edit flows) or **"Fixed — send back for review"** with a note (`meta.fixNote`), which puts it back to PENDING at the first step. Once re-approved, the page shows "Was sent back by … — fixed" as a record.
- **Reject = sent back down the chain (#102):** the Stamp step's **Reject** now behaves exactly like Return for correction — records `meta.returned` (who, role, note), clears every stamp except `draftedBy`, so the fixed log climbs the whole chain again. Previously it only set `REJECTED` and left old stamps on.
- **Filer is told and taken to the fix (#102):** push notification "Fix needed: <form>" (function `notifySubmissionReturned`; tapping opens the log), a red **"Sent back to you — Fix now"** banner at the top of every portal, and the bell (now showing who sent it back). **Fix now** opens the log as a page with the note; **Edit & resubmit** hands it to the portal's own form (`lib/fixEditors.ts` — Housekeeper, Technician daily log, Janitor/Restroom, Laundry, Gemba Walk, Ops Logs Restroom/Laundry); other types use **Fixed — send back for review** with a note. Reviewers see "Waiting for <name> to fix it". When it's resent, the person who sent it back gets a "Fixed & resent" push and it's back in the queue marked "Was sent back by … — fixed".
- **Choose who fixes it (#104):** Reject (at a stamp step) and Return for correction now open one box: the note + **"Who should fix it?"** — the person who filled it in, or any reviewer below who had stamped it (e.g. the Supervisor who checked it). Store: `sendBack(id, note, target)`.
  - To the filer → `REJECTED`, all stamps but Drafted cleared (as before).
  - To a reviewer (e.g. Manager → Supervisor) → stays `PENDING`, stamps from that step on are cleared so it's back in that reviewer's queue; `meta.returned = { …, to: 'reviewer', toStep, toUserId, toName }`. The reviewer gets a push + the "Fix now" banner; the page shows "Sent back to <Supervisor> by <Manager>" with two choices: **Fixed — send back up to <Manager>** (note + optional e-signature → `resolveReturned`: records `returned.resolved` and re-stamps their step, so it goes straight back to the Manager) or **Reject** to pass it down to the technician. The Manager is pushed "Fixed & sent back up", and sees the fix note on the log.
  - Rules: branch 4 (superior sends back) now allows `status` `REJECTED` **or** `PENDING`; new rules test (22/22).
- **Rejected tab (#103):** Technician, Housekeeper, Janitor and Laundry portals have a **Rejected** tab (red count badge): "Needs fixing" (each with the Supervisor/Manager comment, who and when, and **Open & fix**) and "Fixed & resent" (comment, fix note, waiting for review / approved). `components/Portals/RejectedLogsTab.tsx`. Also since #103 the app always loads the signed-in user's own REJECTED logs (`subscribeSubmissions` third listener: `userId == me && status == REJECTED`), whatever site they were filed under or how old — before, a log filed under a site the person had since moved off (e.g. "Main Site" before the import) never reached them.
- **Visibility:** Ops Logs (Supervisor / Manager / GM) shows **"Sent back — waiting for fix"** with every returned log in scope until it's resolved.
- **Delete:** superiors can soft-delete (`deletedAt` / `deletedBy`) behind the type-DELETE confirmation. Records stay in Firestore.
- **Navigation:** the detail is a page on every screen size (Ops Logs and Admin → Activity). `useBackToClose()` pushes a history entry, so the phone/browser Back returns to the list.
- **Limitation:** Temperature Control / Dishwashing are one sheet per asset per day; a frontline filer can only reopen **today's** form. A returned sheet from an earlier day is resolved with "Fixed — send back for review" plus an explanation, or deleted by a superior.

### 3.4 Review on the paper form, stamps and e-signatures (#99 – #100)
- **Paper form on screen (#99):** the review page renders the same PSU paper sheet used for Print (`OPS_PRINT_COMPONENTS`), filled with what the worker entered, for every form type and at every level of the chain. Photos are listed under the sheet.
- **Viewer (`OpsLogs/PaperViewer.tsx`, #100):** opens fit-to-width; − / + with a % readout, **Fit**, pinch-to-zoom and double-tap on phones, Ctrl/⌘ + scroll (or trackpad pinch) and double-click on desktop. **Full screen** fills the screen and pans both ways; on a portrait phone a landscape form is turned sideways automatically (Rotate button toggles). Esc or the phone's Back closes full screen without leaving the log.
- **Stamps on the paper (#100):** once a step is stamped, its signature line shows a coloured rubber stamp — "✓ CHECKED / APPROVED / VERIFIED BY <job title>", name, date (blue / green / purple). Every sheet's signature lines use it (`StampMark` in `print/paperShared.tsx`; `OpsPrintSignoff` for Room Cleaning, Technician log and Gemba Walk). Temperature Control and Dishwashing show both stamps on their single "Mengetahui" line. New stamps store `role`; older stamps get the job title filled in from the user list (`withStampRoles`). Since #101 the filer gets a **DRAFTED** stamp too (slate), so a finished log carries three stamps — Drafted | Checked (Supervisor) | Approved (Manager) — and each person's **full name** (first + last from the user list) is printed on their signature line under the stamp. Mess Hall, Staff Ready and Restroom gained Prepared-by / Checked-by stamp spots.
- **E-signature (optional, #100):** pressing Stamp opens **Sign & stamp** (`OpsLogs/SignatureStampDialog.tsx`): draw with finger / stylus / mouse, reuse the saved signature, or **Stamp without signature**. The signature is cropped and shrunk to ≤ 300×100 PNG (~10 KB) and saved on the stamp as `meta.signoff.<step>.signature`; it appears inside the stamp on screen and in print. "Remember on this device" keeps it in that browser's localStorage only (not synced between devices). No rules change was needed (reviewers may already change `meta`).

---

## 4. Data model (Firestore collections)

| Collection | Doc | Written by | Read by clients | Notes |
|---|---|---|---|---|
| `users/{email}` | profile: name, role, site, assignedSites, uid, staffCode, isActive, requirePassword | Admin/Manager, self-signup, import fn | **Whole collection, every signed-in user** | ~1,400 docs |
| `staffCodes/{CODE}` | `{ email }` | Admin/Manager, import fn | single `get` (public) | Staff ID → email index |
| `submissions/{id}` | type, items[], meta{… signoff (each step: userId, name, at, role, signature?), returned, fixNote}, status, timestamps | frontline/supervisors; superiors (return / delete) | Last 60 days + PENDING, user's sites (older on demand) | Grows daily; soft-delete only (`deletedAt`) |
| `warnings/{id}` | supervisor warnings | supervisors | whole collection | |
| `fieldReports/{id}` | wrench-icon issue reports (+ photo URL) | anyone | whole collection | |
| `correctiveActions/{id}` | CAPA items | supervisors/managers | whole collection | |
| `trainings/{id}` | modules + `completedBy[]` | admin / self | whole collection | |
| `messages/{id}` | chat message | sender | **only own** (`participants array-contains uid`) | Never deleted (hidden/blanked instead) |
| `pushTokens/{token}` | `{ uid, email, userAgent, updatedAt }` | own device | none (function only) | Dead tokens pruned by `notifyChatMessage` |
| `checkSchedules/{id}` | which form is due when, per site / asset / section | Admin, Managers | signed-in | Drives missed-check alerts |
| `missedChecks/{id}` | a past-due slot (and "done late") | `checkMissedChecks` only | signed-in | |
| `appErrors/{id}` | app / server error reports | any signed-in user (create-only, capped) | Admin only | Deleted after 30 days by `errorDigest` |
| `errorFingerprints/{id}` | grouped error kinds | `errorDigest` only | Admin only | |

Rules: `firestore.rules` (deployed automatically by CI). Storage rules: `storage.rules` (legacy uploads only).

---

## 5. Cloud Functions (`functions/src/index.ts`, Node 22, us-central1)

| Function | Type | Purpose |
|---|---|---|
| `createStaffAccount` | callable v2 | Legacy admin account creation |
| `reclaimAbandonedSignup` | callable v2 | Frees orphaned Auth accounts on signup |
| `mintStaffCodeToken` | callable v2 | Staff ID → custom token (refuses `requirePassword` accounts) |
| `createUserProfile` | Auth onCreate (1st gen) | Backstop profile creation (never overwrites) |
| `adminResetCredentials` | callable v2 | Admin/Manager resets another user's email/password |
| `mintCloudinaryUploadSignature` | callable v2 | Signed Cloudinary uploads (secret stays server-side) |
| `notifyChatMessage` | Firestore onCreate `messages/{id}` (1st gen) | FCM push to recipient's devices |
| `notifySubmissionReturned` | Firestore onUpdate `submissions/{id}` (1st gen) | → REJECTED: push the filer "Fix needed" (opens `/?fix=<id>`) and anyone below who'd stamped it; REJECTED → PENDING: push whoever sent it back "Fixed & resent" |
| `bulkImportStaff` | callable v2 (540 s, 512 MiB) | HR list import |
| `checkMissedChecks` | scheduled, every 30 min (WIT) | Records missed checks, pushes alerts (`missedChecks.ts`) |
| `errorDigest` | scheduled, hourly | Groups errors, alerts Admins, prunes reports older than 30 days (`monitoring.ts`) |

---

## 6. Deployment & configuration

- **App:** Vercel builds `main` automatically.
- **Functions + rules:** `.github/workflows/deploy-functions.yml` on push to `main` touching `functions/**`, `firestore.rules`, `storage.rules`, `firebase.json` (or manual *Run workflow*). Uses `firebase-tools@14 … --force` (creates the Artifact Registry cleanup policy for old function images).
- **Service account** (`FIREBASE_SERVICE_ACCOUNT` secret): `firebase-adminsdk-fbsvc@pangansari-utama.iam.gserviceaccount.com` — roles include Cloud Functions Admin, Editor, Firebase Rules Admin, Storage Admin.
- **Vercel env vars:** `VITE_FIREBASE_*` (config) and `VITE_FIREBASE_VAPID_KEY` (web push, Config-type, public by design).
- `src/vite-env.d.ts` added so `import.meta.env` is typed.

---

## 7. Security decisions worth keeping

- Imported staff's Staff ID is their HR number (not secret) → **Staff ID + password** required (`requirePassword`), enforced client-side and in `mintStaffCodeToken`.
- **Open gap:** accounts that existed before the import still allow **Staff ID-only** login; 11 of them have their HR number as Staff ID (e.g. managers). Proposed fix: require a password on Staff ID login for any account that has one.
- Managers cannot create/edit/delete ADMIN accounts or point a Staff ID at an Admin (rules + `adminResetCredentials`).
- Chat pairs and the 15-min edit window are enforced in `firestore.rules`, not just the UI.
- Returning or deleting someone else's log requires outranking the filer in the same department (`outranksSubmitter()`); a superior can't change the answers while sending a log back. Covered by rules tests.
- **Rules tests** (`npm run test:rules`; 21 tests at #97) run in CI on rule changes and before every rules deploy.
- **Known weakness (pre-existing):** the reviewer branch of the submissions rule lets **any** signed-in non-filer stamp or reject a PENDING submission; the role/step check lives in the app only. Worth tightening with the same rank helpers.

---

## 8. Open items / decisions pending (from this session)

1. **Retire "Main Site" (`site-1`) and "SPCS" (`site-spcs`)** — not real locations. Proposal: remove from pickers, flag users on them as "No location set", add a "No location" filter, stop defaulting self-signups to `site-1` (`authService.ts` + `createUserProfile`).
2. **Clearer Site Access labels**: "Home Site" → "Only <their location>", "All Sites" → "All locations", "Custom" → "Choose locations"; hide Site Access for frontline roles.
3. **12 duplicate accounts** from the import (hand-made originals without Staff IDs). Clean-up: delete the `@staff.psu.local` copy, set original's site + Staff ID. Personnel → "Possible duplicates" lists them.
4. **208 staff not imported** (drivers 53, clerks 51, maintenance 36, sport & rec 35, SSO 22, office 4, 68 SGH leads 3, storemen 3, artist 1). Proposals: *Maintenance* role that resolves wrench-icon reports; *Support Staff* (chat + issues only); Sport & Rec under Housekeeping. Visual: "PSU FieldOps Role Pyramid" artifact.
5. **14 Leadhands from support jobs** (L/H Clerk 9, L/H Driver 2, L/H Electrician 2, L/H Instructor 1) — confirm or move.
6. **Townsite Asst. Managers (4)** imported as FS Manager; **Head of General Services / Manager COC** imported as GM — confirm.
7. **68 SGH** is mixed (kitchen + camp); treat kitchen jobs → FS, camp jobs → HK.
8. Paper forms still missing: **UN.00.65 Room Cleaning**, **Technician daily log**, clear photo of **UN.00.45** title; Temperature Control / Dishwash assets only cover Melati.
9. Personnel "possible duplicates" check and Staff ID-only security gap (§7).
10. **Document Control (SOPs) and Inventory Management**: requested; waiting for PSU to describe their current system (numbering, approval, revisions; items, stores, counts, requests and reorders) before building.
11. **Staff notification**: email drafted 15 Nov 2026 for Mark to send (imported / not-imported Excel lists, how to log in, Print form, Document Control / Inventory request).
12. Tighten the submissions reviewer rule (§7 known weakness) and enforce site access for return / delete server-side.
13. A returned Temperature Control / Dishwashing sheet from an earlier day can't be reopened by the filer (§3.3 limitation).

---

## 9. Storage & capacity — everything the next session needs

### 9.1 Where data lives today

| Store | What | Growth driver | Current safeguards |
|---|---|---|---|
| **Firestore `submissions`** | Every checklist, with items/meta (now also raw readings) | ~1,150 frontline staff + supervisors filing daily; Temp Control = 1 doc per asset per day; Restroom = 1 doc per slot (3/day/section) | Soft delete only — **nothing is ever removed** |
| **Firestore `messages`** | Chat | Grows with use; deletes are logical (blank/hide), docs remain | None |
| **Firestore `users`** | ~1,400 profiles | Imports, hires | None needed |
| **Firestore `fieldReports`, `correctiveActions`, `warnings`, `trainings`** | Small docs | Steady | None |
| **Cloudinary** | All new photos (submission items, field reports) | Every photo taken | Client compresses to **max 1280 px, quality 0.7** (`PhotoCapture.tsx`); views use auto-optimised URLs (`utils/cloudinaryUrl.ts`) |
| **Firebase Storage** | Legacy photos only (`submissions/{uid}/…`) | No new uploads | 5 GB free tier; `storage.rules` blocks deletes |
| **Artifact Registry** | Function container images | Every functions deploy | Cleanup policy set by `--force` |
| **Browser `localStorage`** | Demo-mode data; UI prefs; staff-session fallback; push token id | Demo mode only (photos as base64 there!) | `safeSetItem` + "storage full" banner (`Layout.tsx`) |
| **Browser IndexedDB (Dexie)** | Offline submission outbox | Only while offline | Entries removed once written |
| **Service worker cache** | App shell + static assets (`psu-fieldops-v3`) | Each deploy (old caches deleted on activate) | Versioned cache name |

### 9.2 Known capacity risks (highest first)
1. **Every client subscribes to the entire `submissions` collection** (`subscribeSubmissions` in `services/submissionsService.ts` — no `where`, no `limit`, no date range). With ~1,400 users this means: each app open downloads all submissions ever filed; Firestore **document reads** scale as *users × total submissions*; phone memory and load time grow every day. Same pattern (smaller) for `users`, `fieldReports`, `correctiveActions`, `warnings`, `trainings`.
2. **No retention/archiving** for submissions or messages (soft delete keeps everything).
3. **No persistent Firestore cache** (`initializeFirestore` without `persistentLocalCache`) — every load is a full re-download.
4. Photos: compressed once on upload; Cloudinary free-tier storage/bandwidth limits unknown vs. current usage — needs a dashboard check.
5. Demo mode stores photos as base64 in `localStorage` (quota ~5–10 MB) — only matters if demo mode is used in practice.

### 9.2a Fixed (storage workstream, branch `claude/gifted-mayer-ohigvv`)
- **Scoped submissions:** each device now live-listens only to the last 60 days plus anything still `PENDING`, limited to the user's sites (`siteId in …` when ≤30 sites). Older history loads on demand, 300 at a time, from a "Load older records" button under every history list and Admin → Activity. Composite indexes are in `firestore.indexes.json` (deployed by CI); if an index is still building, queries fall back to the unfiltered form instead of showing nothing.
- **Persistent Firestore cache** (IndexedDB) enabled; wiped on logout so shared phones don't keep the previous person's data (logout now reloads the page).
- **Backups:** CI creates Firestore backup schedules if missing (daily kept 7 days, weekly kept 14 weeks).
- **Photos:** new uploads go to **Firebase Storage** (project is on Blaze); saved at max 1024 px, WebP 0.7 (JPEG 0.7 where WebP encoding isn't supported) instead of JPEG 0.85 at 1280 px, roughly half the size. Cloudinary photos already stored keep working.
- **Not changed (on purpose):** Staff ID-only login for pre-import accounts stays as-is until PSU supplies details for those users.
- **Still open:** `users`, `warnings`, `fieldReports`, `correctiveActions`, `trainings` are still whole-collection listeners (small today); dashboards/analytics only see what's loaded (60 days by default).

### 9.3 Directions to evaluate (not started)
- Scope subscriptions: by **site** (`where('siteId','in', userSites)`), **department**, **date window** (e.g. last 30–60 days), and **role** (frontline only needs their own submissions). Needs composite indexes and matching `firestore.rules`.
- Paginated / on-demand history (load older months only when asked).
- Enable `persistentLocalCache` (IndexedDB) to cut repeat reads.
- Retention policy: archive submissions older than N months (e.g. scheduled function → BigQuery/Cloud Storage export, or monthly summary docs) and purge chat older than N months.
- Monitor: Firestore usage dashboard (reads/writes/storage), Cloudinary usage, Firebase Storage usage; set budget alerts in Google Cloud Billing.
- Firestore indexes file (`firestore.indexes.json`) does not exist yet — add when queries get `where` + `orderBy`.

---

## 10. Verification notes
- Every PR passed `vite build`; no new TypeScript errors vs. the pre-existing baseline (the repo has pre-existing `ListCard` generic typing errors).
- Features were exercised in **demo mode** with Playwright (screenshots/PDF renders). Production-only paths (FCM delivery, `bulkImportStaff`) were verified by successful deploys and the user's live import.
- Firestore rules: automated tests since #93 (`npm run test:rules`, emulator; 21/21 passing at #97), run in CI before every rules deploy. They also run in the cloud dev environment (Java + emulator available).
- #97 was exercised in demo mode on a phone-size screen: page view, browser Back, Stamp, Return for correction, "Sent back" list, Manager delete. Its deploy run (rules tests + rules publish) passed.
