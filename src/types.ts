export type UserRole =
  | 'HOUSEKEEPER'
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'HOUSEKEEPING_MANAGER'
  | 'FOOD_SAFETY_TECHNICIAN'
  | 'FOOD_SAFETY_SUPERVISOR'
  | 'FOOD_SAFETY_MANAGER'
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
  marks: Record<string, 'GOOD' | 'NOT_GOOD'>; // keyed by DailyFoodHandlerCriterion.id
  readyToWork: boolean;
  remark?: string;
}

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  timestamp: string;
  type: 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'FOOD_SAFETY_INSPECTION' | 'GEMBA_WALK' | 'DAILY_FOOD_HANDLER';
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
