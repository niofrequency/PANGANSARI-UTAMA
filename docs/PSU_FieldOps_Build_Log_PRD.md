# PSU FieldOps — Build Log & Current-State PRD

**Product:** PSU FieldOps (PT Pangansari Utama) — field operations app for checklists, sign-offs, issue reports, chat and staff management across PSU's work locations.
**Repo:** `niofrequency/PANGANSARI-UTAMA` · **Live:** https://pangansari-utama.vercel.app · **Firebase project:** `pangansari-utama`
**Covers:** the work merged in PRs #79 – #91 (13 November 2026), plus the state of the system a follow-up session needs to know about.
**Next workstream:** storage capacity (see §9, which collects every storage-relevant fact in one place).

---

## 1. Stack at a glance

| Layer | What | Where |
|---|---|---|
| Web app | React 19 + Vite + Tailwind 4, PWA (service worker `public/sw.js`) | `src/`, deployed by **Vercel** from `main` |
| Auth | Firebase Auth (email/password, Google, custom tokens for Staff ID) | `src/services/authService.ts` |
| Database | Cloud Firestore (default DB), **no persistent local cache** | `src/lib/firebase.ts`, `src/services/*Service.ts` |
| Photos | **Cloudinary** (new uploads) · Firebase Storage (legacy photos only) | `src/services/cloudinaryPhotoService.ts`, `storage.rules` |
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

Sign-off chain per form: `SIGNOFF_CHAINS` in `src/data/opsLogsCatalog.ts` — frontline fills → Leadhand/Supervisor **Checked by** → Manager **Approved / Verified by**.

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

### 3.1 Chat rules (summary)
- Admin ↔ everyone. Manager ↔ Supervisor/Leadhand, Manager. Supervisor/Leadhand ↔ Manager, Supervisor/Leadhand, frontline. Frontline ↔ Supervisor/Leadhand only.
- Same department except GM/Admin. Food Safety Technicians only with a Supervisor/Leadhand whose **home site** is one of the Technician's sites.
- One Firestore doc per message; `participants: [from, to]`; recipient sets `read`; sender may edit within 15 min (server `sentAt`) or delete for everyone (text blanked); either side can hide (`hiddenFor`).

### 3.2 Bulk import (how it behaves)
- Accepts `.xlsx` / `.csv` (old `.xls` → "Save As .xlsx" message). Finds the `NO. ID / NAMA / LOKASI KERJA / JABATAN` table.
- Role = job title + location kind (`roleFor()` in `employeeImport.ts`). Unmapped jobs are skipped and listed.
- `bulkImportStaff` (admin only, ≤100 rows/call): synthetic email `<id>@staff.psu.local`, random 8-char password, writes `users/{email}` + `staffCodes/{ID}` **before** creating the Auth user, sets `requirePassword: true`. Existing IDs are skipped → re-runs are safe. Passwords returned once → CSV download.
- Result of the 5 Nov 2026 list: **1,589 rows → 1,381 imported, 208 skipped** (no matching role). Import was run successfully in production.

---

## 4. Data model (Firestore collections)

| Collection | Doc | Written by | Read by clients | Notes |
|---|---|---|---|---|
| `users/{email}` | profile: name, role, site, assignedSites, uid, staffCode, isActive, requirePassword | Admin/Manager, self-signup, import fn | **Whole collection, every signed-in user** | ~1,400 docs |
| `staffCodes/{CODE}` | `{ email }` | Admin/Manager, import fn | single `get` (public) | Staff ID → email index |
| `submissions/{id}` | type, items[], meta{…}, status, timestamps, signoff | frontline/supervisors | **Whole collection, every signed-in user** | Grows daily; soft-delete only (`deletedAt`) |
| `warnings/{id}` | supervisor warnings | supervisors | whole collection | |
| `fieldReports/{id}` | wrench-icon issue reports (+ photo URL) | anyone | whole collection | |
| `correctiveActions/{id}` | CAPA items | supervisors/managers | whole collection | |
| `trainings/{id}` | modules + `completedBy[]` | admin / self | whole collection | |
| `messages/{id}` | chat message | sender | **only own** (`participants array-contains uid`) | Never deleted (hidden/blanked instead) |
| `pushTokens/{token}` | `{ uid, email, userAgent, updatedAt }` | own device | none (function only) | Dead tokens pruned by `notifyChatMessage` |

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
| `bulkImportStaff` | callable v2 (540 s, 512 MiB) | HR list import |

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
- Firestore rules are compiled by the CI deploy before publishing; there are no automated rules tests (emulator not used).
