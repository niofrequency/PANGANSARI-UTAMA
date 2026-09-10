export type UserRole =
  | 'HOUSEKEEPER'
  // Split out of the old single HOUSEKEEPER role: each worker now sees
  // only their own form (the laundry shop's own log, and the toilet
  // cleaning checklist) instead of a 3-way picker. HOUSEKEEPER itself is
  // unchanged — room cleaning (UN.00.65) only.
  | 'HOUSEKEEPING_LAUNDRY'
  | 'HOUSEKEEPING_JANITOR'
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'HOUSEKEEPING_MANAGER'
  | 'FOOD_SAFETY_TECHNICIAN'
  | 'FOOD_SAFETY_SUPERVISOR'
  | 'FOOD_SAFETY_MANAGER'
  // Site-wide leadership (GM, Deputy GM, HR & GA, COC, SPCS, etc.) that
  // sits above both departments rather than inside one of them — sees
  // both departments' Escalations queues and the Inspections tab, unlike
  // HOUSEKEEPING_MANAGER/FOOD_SAFETY_MANAGER which are each scoped to
  // their own department (see ManagerPortal.tsx).
  | 'GENERAL_MANAGER'
  | 'ADMIN';

export interface User {
  id: string;
  name: string; // derived display name — always firstName + ' ' + lastName
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  site: string;
  isActive: boolean;
  // Which sites this person can act on — a Supervisor/Manager/GM's
  // review scope (Field Queue, Escalations, Dashboard, Ops Logs), or a
  // frontline worker's set of sites to submit for / scan a job QR at
  // (see hooks/useWorkingSite.ts). Unset (the default) means "just
  // `site` above," same as before this field existed. 'ALL' means every
  // site, the way GENERAL_MANAGER and ADMIN already behaved.
  assignedSites?: string[] | 'ALL';
  // Short login code for the Scan-to-Job flow (StaffIdGate.tsx) — an
  // alternative to email/password for frontline staff scanning a job QR.
  // Unique, uppercase, 3-12 chars [A-Z0-9]. Optional: most office roles
  // never get one, and even FOOD_SAFETY_TECHNICIAN / HOUSEKEEPER accounts
  // only have one once an Admin sets it (see AdminPortal's "Staff ID"
  // action). The matching PIN is never carried on this type — see
  // useAppStore.ts's setStaffIdentity()/loginByStaffCode() and
  // authService.ts for where it's handled (hashed in Firebase mode,
  // demo-only plaintext `pin` field on the raw seed data in mockData.ts).
  staffCode?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WARNING';

// Per-section rollup for the Food Safety Inspection Checklist (and any future
// multi-section audit) — lets a detail view show the same category breakdown
// the source workbook's "Score" sheet does, without re-deriving it from 169
// individual items every render.
export interface SubmissionSectionScore {
  key: string;
  titleId: string;
  titleEn: string;
  scorePct: number; // 0-100
}

// One staff member's row on the Daily Food Handler Assessment Checklist —
// the source is a per-shift roster (up to 22 rows in the template), not a
// single-subject audit like the other two checklists, so it doesn't fit
// Submission.items the way they do; it's carried on meta.roster instead.
// `readyToWork` is computed by this app (GOOD on every one of the 19
// criteria) rather than taken from a source formula — the source's
// "Ready to Work" column is filled in by hand, with no formula behind it.
export interface DailyFoodHandlerRosterEntry {
  no: number;
  name: string;
  position: string;
  marks: Record<string, string>; // keyed by DailyFoodHandlerCriterion.id — free text as typed (e.g. "v" / "x"), see isGoodMark()
  readyToWork: boolean;
  remark?: string;
}

// Additional operations logs (PSU_Additional_Ops_Forms_PRD.md) — UN.00.65
// room cleaning, GEMBA, FSI, and DFH already existed and are not part of
// this set. Each has its own catalog file under src/data/ and its own
// fill form under src/components/OpsLogs/.
//
// UF.10000 (Temperature Control) and UN.00.51 (Dishwashing Temp) were
// removed from every worker-facing portal by request; kept out of this
// union entirely so nothing can newly submit them.
export type OpsLogType =
  | 'MESS_HALL_HYGIENE'  // UWL10001 — area checklist, B/R marks
  | 'COOKING_SERVICE'    // UF.09001 — cook + install time/temp per meal
  | 'HOT_PACKED_MEAL'    // UF.09000 — pack + cook/hold/pack windows
  | 'THAWING'            // UN.00.43 — method + product batches
  | 'STAFF_READY'        // Persiapan Diri Karyawan — shift roster
  | 'LAUNDRY_SHOP'       // Laundryshop daily list — room x garment counts
  | 'RESTROOM';          // UN.00.45 — toilet cleaning, 3 daily slots

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  timestamp: string;
  type: 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'FOOD_SAFETY_INSPECTION' | 'GEMBA_WALK' | 'DAILY_FOOD_HANDLER' | OpsLogType;
  status: SubmissionStatus;
  items: {
    id: string;
    question: string;
    answer: string | boolean | number;
    photoUrl?: string;
    remarks?: string; // free-text finding/remark tied to this one item
    // GEMBA_WALK only — the source form gives each item its own separate
    // "corrective action" and "comment" columns alongside the observation
    // (carried in `remarks` above).
    correctiveAction?: string;
    comment?: string;
  }[];
  notes?: string;
  rejectionReason?: string;
  score?: number;
  // Structured header + scoring info for audit-style submissions
  // (FOOD_SAFETY_INSPECTION, GEMBA_WALK). Optional so existing HOUSEKEEPING /
  // FOOD_SAFETY submissions are unaffected.
  meta?: {
    areaAudited?: string;
    areaOwner?: string;
    inspectorName?: string;
    category?: 'A' | 'B' | 'C' | 'D';
    categoryStatus?: string;
    sectionScores?: SubmissionSectionScore[];
    // GEMBA_WALK only
    project?: string;
    unit?: string;
    evaluationCounts?: { conform: number; notConform: number; nonObserved: number; na: number };
    threeInARowNotes?: { positives?: string; improvements?: string };
    // DAILY_FOOD_HANDLER only
    roster?: DailyFoodHandlerRosterEntry[];
    checkedBy?: string; // "Checked by, (SPV)" in the source
    acknowledgedBy?: string; // "Acknowledge by, (Area Owner)"
    verifiedBy?: string; // "Verified by, (HSSE Representative)"
    // Scan-to-Job (deepLink.ts / StaffIdGate.tsx) — set when this
    // submission was reached via a job QR rather than the normal tab
    // navigation. qrAction mirrors the `a=` deep-link param.
    source?: 'qr';
    qrAction?: 'fridge' | 'core' | 'clean' | 'wellness' | 'room';
    // HOUSEKEEPING (UN.00.65 room-cleaning checklist) only
    barak?: string;
    roomId?: string;
    qrRoomId?: string;
    // One proof photo for the whole submission, not per section.
    photoUrl?: string;

    // Paper document number this submission corresponds to — shown on the
    // read-only header chip (site / department / form id / user / staff
    // code) every ops-log fill screen shows instead of handwriting lokasi
    // and ID. 'UN.00.65' kept for the room-cleaning checklist above.
    formId?: 'UN.00.65' | 'UWL10001' | 'UF.09001' | 'UF.09000' | 'UN.00.43' | 'STAFF_READY' | 'UN.00-LAUNDRY' | 'UN.00.45';

    // Named sign-off chain (PRD section 6) — logged-in user + timestamp,
    // not a signature canvas. Which of these four a given OpsLogType uses,
    // and which one is the *last* required stamp (the one that flips
    // status to APPROVED), is defined per-type in
    // src/data/opsLogsCatalog.ts's SIGNOFF_CHAINS — not every form uses
    // all four slots.
    signoff?: {
      draftedBy?: { userId: string; name: string; staffCode?: string; at: string };
      checkedBy?: { userId: string; name: string; at: string };
      approvedBy?: { userId: string; name: string; at: string };
      verifiedBy?: { userId: string; name: string; at: string };
    };

    // RESTROOM (UN.00.45) — its 3 daily slots
    slot?: '08' | '11' | '16';
    // COOKING_SERVICE / HOT_PACKED_MEAL / THAWING — true if any reading on
    // this submission breached its paper limit; still saves either way.
    outOfRange?: boolean;

    // MESS_HALL_HYGIENE (UWL10001)
    areaKey?: string;

    // RESTROOM (UN.00.45)
    section?: string;

    // COOKING_SERVICE (UF.09001) / HOT_PACKED_MEAL (UF.09000)
    mealPeriods?: string[]; // which of breakfast/lunch/dinner/supper were actually cooked that day
    packType?: string; // HOT_PACKED_MEAL only

    // THAWING (UN.00.43)
    thawMethod?: '1' | '2' | '3' | '4';

    // STAFF_READY (Persiapan Diri Karyawan)
    shift?: 'day' | 'night';

    // LAUNDRY_SHOP (Laundryshop daily list)
    laundryDate?: string;
  };
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  type: 'VIDEO' | 'PDF' | 'SLIDES';
  completedBy: string[]; // User IDs
}

export interface Warning {
  id: string;
  technicianId: string;
  technicianName: string;
  supervisorId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

// "Something's broken" reports — a free-form note a frontline worker can
// raise any time, outside of any checklist, when they spot a finding worth
// a supervisor knowing about (a leaking pipe, a broken lock, anything that
// isn't a pass/fail checklist item). Distinct from Submission: it's not
// graded, it's tracked to a fix. Housekeeper/Janitor/Laundry reports go to
// the Housekeeping Supervisor at their site; Food Safety Technician
// reports go to the Food Safety Supervisor — same site+department scoping
// as their regular submissions (see lib/siteScope.ts).
export type FieldReportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface FieldReport {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  department: 'HOUSEKEEPING' | 'FOOD_SAFETY';
  timestamp: string;
  message: string;
  photoUrl?: string;
  status: FieldReportStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  // Required once RESOLVED — what was actually done about it. Shown back
  // to whoever filed the report so "it's fixed" isn't just a status flip
  // with no explanation.
  resolutionNote?: string;
}
