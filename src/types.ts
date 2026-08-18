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

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  siteId: string;
  siteName: string;
  timestamp: string;
  type: 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'FOOD_SAFETY_INSPECTION';
  status: SubmissionStatus;
  items: {
    id: string;
    question: string;
    answer: string | boolean | number;
    photoUrl?: string;
    remarks?: string; // free-text finding/remark tied to this one item
  }[];
  notes?: string;
  rejectionReason?: string;
  score?: number;
  // Structured header + scoring info for audit-style submissions
  // (currently: FOOD_SAFETY_INSPECTION). Optional so existing HOUSEKEEPING /
  // FOOD_SAFETY submissions are unaffected.
  meta?: {
    areaAudited?: string;
    areaOwner?: string;
    inspectorName?: string;
    category?: 'A' | 'B' | 'C' | 'D';
    categoryStatus?: string;
    sectionScores?: SubmissionSectionScore[];
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
