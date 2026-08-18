import { User, Site, Submission, TrainingModule, Warning, UserRole, DailyFoodHandlerRosterEntry } from '../types';
import { INSPECTION_SECTIONS } from './inspectionChecklistData';
import { ConformityCode, scoreItems, getPsuCategory } from './inspectionScoring';
import { GEMBA_SECTIONS, GembaEvaluation } from './gembaWalkData';
import { scoreGembaEvaluations } from './gembaWalkScoring';
import { DAILY_FOOD_HANDLER_GROUPS, DAILY_FOOD_HANDLER_ALL_CRITERIA } from './dailyFoodHandlerData';
import { scoreRoster } from './dailyFoodHandlerScoring';

// Edit this with your real site(s)/location(s) — this is the only piece of
// this file that isn't demo content (the Admin Portal doesn't yet have a
// "manage sites" UI; site selection in Add Staff / analytics both read from
// this list). Once you add real sites here, redeploy.
export const SITES: Site[] = [
  { id: 'site-1', name: 'Main Site', location: '' },
];

const SITE_ID = 'site-1';
const SITE_NAME = 'Main Site';

// ---------------------------------------------------------------------------
// Demo-mode seed data.
//
// None of this has any effect once Firebase is configured (see
// useAppStore.ts) — real accounts, roles, and submissions come from
// Firestore instead. This is purely so `git clone` + `npm run dev` shows a
// working, populated app instead of an empty shell: one crew per
// department, logged in via email only (demo mode's `login()` doesn't
// check the password), with enough submission history to see every screen
// — Field Queue, Escalations, the Dashboard, and all three Inspections
// audits — with real-looking content on first load.
//
// Log in as any of these by typing the email below with any password.
// ---------------------------------------------------------------------------

export const INITIAL_USERS: User[] = [
  // Housekeeping
  { id: 'u-hk-mgr-1', firstName: 'Dewi', lastName: 'Anggraini', name: 'Dewi Anggraini', email: 'dewi.manager@psu.demo', role: 'HOUSEKEEPING_MANAGER', site: SITE_ID, isActive: true },
  { id: 'u-hk-sup-1', firstName: 'Budi', lastName: 'Santoso', name: 'Budi Santoso', email: 'budi.supervisor@psu.demo', role: 'HOUSEKEEPING_SUPERVISOR', site: SITE_ID, isActive: true },
  { id: 'u-hk-1', firstName: 'Siti', lastName: 'Rahayu', name: 'Siti Rahayu', email: 'siti.housekeeper@psu.demo', role: 'HOUSEKEEPER', site: SITE_ID, isActive: true },
  { id: 'u-hk-2', firstName: 'Agus', lastName: 'Wijaya', name: 'Agus Wijaya', email: 'agus.housekeeper@psu.demo', role: 'HOUSEKEEPER', site: SITE_ID, isActive: true },
  // Food Safety
  { id: 'u-fs-mgr-1', firstName: 'Ratna', lastName: 'Kusuma', name: 'Ratna Kusuma', email: 'ratna.manager@psu.demo', role: 'FOOD_SAFETY_MANAGER', site: SITE_ID, isActive: true },
  { id: 'u-fs-sup-1', firstName: 'Hendra', lastName: 'Saputra', name: 'Hendra Saputra', email: 'hendra.supervisor@psu.demo', role: 'FOOD_SAFETY_SUPERVISOR', site: SITE_ID, isActive: true },
  { id: 'u-fs-tech-1', firstName: 'Made', lastName: 'Wirawan', name: 'Made Wirawan', email: 'made.technician@psu.demo', role: 'FOOD_SAFETY_TECHNICIAN', site: SITE_ID, isActive: true },
  { id: 'u-fs-tech-2', firstName: 'Nur', lastName: 'Fadillah', name: 'Nur Fadillah', email: 'nur.technician@psu.demo', role: 'FOOD_SAFETY_TECHNICIAN', site: SITE_ID, isActive: true },
];

const daysAgo = (n: number, hour = 9, minute = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// --- Housekeeping: the 4-item daily room checklist (see HousekeeperPortal) ---
const HK_CHECKLIST_QUESTIONS = [
  'Room vacuumed and dusted',
  'Waste bins emptied',
  'Linen and towels replaced',
  'Toilet and shower sanitized',
];

function hkSubmission(opts: {
  id: string; userId: string; userName: string; timestamp: string;
  status: Submission['status']; allDone: boolean; rejectionReason?: string;
}): Submission {
  return {
    id: opts.id,
    userId: opts.userId,
    userName: opts.userName,
    role: 'HOUSEKEEPER',
    siteId: SITE_ID,
    siteName: SITE_NAME,
    timestamp: opts.timestamp,
    type: 'HOUSEKEEPING',
    status: opts.status,
    items: HK_CHECKLIST_QUESTIONS.map((question, idx) => ({
      id: String(idx + 1),
      question,
      answer: opts.allDone || idx < 3, // the "incomplete" demo case leaves the last item unchecked
    })),
    score: 100,
    rejectionReason: opts.rejectionReason,
  };
}

export const INITIAL_SUBMISSIONS_HOUSEKEEPING: Submission[] = [
  hkSubmission({ id: 'seed-hk-1', userId: 'u-hk-1', userName: 'Siti Rahayu', timestamp: daysAgo(1, 8), status: 'APPROVED', allDone: true }),
  hkSubmission({ id: 'seed-hk-2', userId: 'u-hk-2', userName: 'Agus Wijaya', timestamp: daysAgo(1, 10), status: 'APPROVED', allDone: true }),
  hkSubmission({ id: 'seed-hk-3', userId: 'u-hk-1', userName: 'Siti Rahayu', timestamp: daysAgo(0, 8), status: 'PENDING', allDone: true }),
  hkSubmission({ id: 'seed-hk-4', userId: 'u-hk-2', userName: 'Agus Wijaya', timestamp: daysAgo(2, 9), status: 'REJECTED', allDone: false, rejectionReason: 'Toilet not sanitized — please redo and re-submit with a photo.' }),
];

// --- Food Safety: Technician daily log + 19-item wellness self-check ---
// (see TechnicianPortal — same shape it submits: items '1'/'2'/'3' are the
// fridge temp / core temp / area-clean checks, followed by one item per
// DAILY_FOOD_HANDLER_ALL_CRITERIA criterion.)
function fsDailyLogSubmission(opts: {
  id: string; userId: string; userName: string; timestamp: string;
  status: Submission['status']; allGood: boolean;
}): Submission {
  const wellnessItems = DAILY_FOOD_HANDLER_ALL_CRITERIA.map((c, idx) => ({
    id: c.id,
    question: c.labelEn || c.labelId,
    // one flagged criterion ("sore eyes") for the not-all-good demo case
    answer: opts.allGood || c.id !== 'soreEyes',
  }));
  const goodCount = wellnessItems.filter(i => i.answer).length;
  return {
    id: opts.id,
    userId: opts.userId,
    userName: opts.userName,
    role: 'FOOD_SAFETY_TECHNICIAN',
    siteId: SITE_ID,
    siteName: SITE_NAME,
    timestamp: opts.timestamp,
    type: 'FOOD_SAFETY',
    status: opts.status,
    items: [
      { id: '1', question: 'Fridge Temp (°C)', answer: '4' },
      { id: '2', question: 'Core Cooking Temp (°C)', answer: '75' },
      { id: '3', question: 'Area Cleaned & Sanitized', answer: true },
      ...wellnessItems,
    ],
    score: Math.round((goodCount / DAILY_FOOD_HANDLER_ALL_CRITERIA.length) * 100),
  };
}

export const INITIAL_SUBMISSIONS_FOOD_SAFETY_LOGS: Submission[] = [
  fsDailyLogSubmission({ id: 'seed-fs-log-1', userId: 'u-fs-tech-1', userName: 'Made Wirawan', timestamp: daysAgo(1, 7), status: 'APPROVED', allGood: true }),
  fsDailyLogSubmission({ id: 'seed-fs-log-2', userId: 'u-fs-tech-2', userName: 'Nur Fadillah', timestamp: daysAgo(1, 7, 30), status: 'APPROVED', allGood: true }),
  fsDailyLogSubmission({ id: 'seed-fs-log-3', userId: 'u-fs-tech-1', userName: 'Made Wirawan', timestamp: daysAgo(0, 7), status: 'PENDING', allGood: true }),
  // Flagged "Not Ready to Work" case, still sitting in the queue — demos the
  // red-flag card & warning banner in SupervisorPortal.
  fsDailyLogSubmission({ id: 'seed-fs-log-4', userId: 'u-fs-tech-2', userName: 'Nur Fadillah', timestamp: daysAgo(0, 7, 15), status: 'PENDING', allGood: false }),
];

// --- Food Safety Inspection Checklist (169 items · 18 categories) ---
function fsiCodeForIndex(idx: number, mostlyGood: boolean): ConformityCode {
  if (mostlyGood) return idx % 23 === 0 ? 'B' : 'A';
  if (idx % 11 === 0) return 'C';
  if (idx % 5 === 0) return 'B';
  return 'A';
}

function fsiSubmission(opts: {
  id: string; userId: string; userName: string; role: UserRole; timestamp: string;
  areaAudited: string; areaOwner: string; inspectorName: string; mostlyGood: boolean;
}): Submission {
  const allItems = INSPECTION_SECTIONS.flatMap(s => s.items);
  const codes: Record<string, ConformityCode> = {};
  allItems.forEach((item, idx) => { codes[item.id] = fsiCodeForIndex(idx, opts.mostlyGood); });

  const items = allItems.map(item => ({
    id: item.id,
    question: `${item.no ? item.no + ' — ' : ''}${item.labelEn || item.descEn}`,
    answer: codes[item.id] as string,
  }));

  const overall = scoreItems(allItems.map(i => codes[i.id]));
  const category = getPsuCategory(overall.scorePct);
  const sectionScores = INSPECTION_SECTIONS.map(section => {
    const s = scoreItems(section.items.map(i => codes[i.id]));
    return { key: section.key, titleId: section.titleId, titleEn: section.titleEn, scorePct: Math.round(s.scorePct) };
  });

  return {
    id: opts.id,
    userId: opts.userId,
    userName: opts.userName,
    role: opts.role,
    siteId: SITE_ID,
    siteName: SITE_NAME,
    timestamp: opts.timestamp,
    type: 'FOOD_SAFETY_INSPECTION',
    status: 'APPROVED',
    items,
    score: Math.round(overall.scorePct),
    meta: {
      areaAudited: opts.areaAudited,
      areaOwner: opts.areaOwner,
      inspectorName: opts.inspectorName,
      category: category.category,
      categoryStatus: category.status,
      sectionScores,
    },
  };
}

export const INITIAL_SUBMISSIONS_FSI: Submission[] = [
  fsiSubmission({ id: 'seed-fsi-1', userId: 'u-fs-sup-1', userName: 'Hendra Saputra', role: 'FOOD_SAFETY_SUPERVISOR', timestamp: daysAgo(3, 9), areaAudited: 'Main Kitchen — Hot Line', areaOwner: 'Made Wirawan', inspectorName: 'Hendra Saputra', mostlyGood: true }),
  fsiSubmission({ id: 'seed-fsi-2', userId: 'u-fs-mgr-1', userName: 'Ratna Kusuma', role: 'FOOD_SAFETY_MANAGER', timestamp: daysAgo(6, 9), areaAudited: 'Dry Storage & Receiving', areaOwner: 'Nur Fadillah', inspectorName: 'Ratna Kusuma', mostlyGood: false }),
];

// --- GEMBA Walk (59 items · 2 sections) ---
function gembaEvalForIndex(idx: number, mostlyConform: boolean): GembaEvaluation {
  if (mostlyConform) return idx % 19 === 0 ? 'Non Observed' : 'Conform';
  return idx % 4 === 0 ? 'Not Conform' : 'Conform';
}

function gembaSubmission(opts: {
  id: string; userId: string; userName: string; role: UserRole; timestamp: string;
  project: string; unit: string; areaAudited: string; auditors: string; mostlyConform: boolean;
}): Submission {
  const allItems = GEMBA_SECTIONS.flatMap(s => s.categories.flatMap(c => c.items));
  const evals: Record<string, GembaEvaluation> = {};
  allItems.forEach((item, idx) => { evals[item.id] = gembaEvalForIndex(idx, opts.mostlyConform); });

  const items = allItems.map(item => {
    const evaluation = evals[item.id];
    const isNotConform = evaluation === 'Not Conform';
    return {
      id: item.id,
      question: item.descEn,
      answer: evaluation as string,
      remarks: isNotConform ? 'Observed during walk-through — see corrective action.' : undefined,
      correctiveAction: isNotConform ? 'Retrain crew on this point and re-check within 48 hours.' : undefined,
      comment: undefined,
    };
  });

  const overall = scoreGembaEvaluations(allItems.map(i => evals[i.id]));

  return {
    id: opts.id,
    userId: opts.userId,
    userName: opts.userName,
    role: opts.role,
    siteId: SITE_ID,
    siteName: SITE_NAME,
    timestamp: opts.timestamp,
    type: 'GEMBA_WALK',
    status: 'APPROVED',
    items,
    score: overall.compliancePct !== null ? Math.round(overall.compliancePct) : undefined,
    meta: {
      areaAudited: opts.areaAudited,
      inspectorName: opts.auditors,
      project: opts.project,
      unit: opts.unit,
      evaluationCounts: {
        conform: overall.conform,
        notConform: overall.notConform,
        nonObserved: overall.nonObserved,
        na: overall.na,
      },
      threeInARowNotes: {
        positives: 'Crew consistently wearing cut-resistant gloves during prep.',
        improvements: opts.mostlyConform ? undefined : 'Follow up on knife handling near the fryer station.',
      },
    },
  };
}

export const INITIAL_SUBMISSIONS_GEMBA: Submission[] = [
  gembaSubmission({ id: 'seed-gemba-1', userId: 'u-fs-sup-1', userName: 'Hendra Saputra', role: 'FOOD_SAFETY_SUPERVISOR', timestamp: daysAgo(2, 11), project: 'PSU - Grand Hotel Central', unit: 'PSU Catering Mess Hall 72', areaAudited: 'Thawing & Vegetable Preparation', auditors: 'Hendra Saputra', mostlyConform: true }),
  gembaSubmission({ id: 'seed-gemba-2', userId: 'u-fs-mgr-1', userName: 'Ratna Kusuma', role: 'FOOD_SAFETY_MANAGER', timestamp: daysAgo(5, 11), project: 'PSU - Grand Hotel Central', unit: 'PSU Catering Mess Hall 72', areaAudited: 'Fryer & Hot Line', auditors: 'Ratna Kusuma', mostlyConform: false }),
];

// --- Daily Food Handler Assessment (19 checks × crew roster) ---
function dfhRosterEntry(no: number, name: string, position: string, allGood: boolean, remark?: string): DailyFoodHandlerRosterEntry {
  const marks: Record<string, string> = {};
  DAILY_FOOD_HANDLER_ALL_CRITERIA.forEach(c => {
    marks[c.id] = allGood || c.id !== 'hair' ? 'v' : 'x';
  });
  return { no, name, position, marks, readyToWork: allGood, remark };
}

function dfhSubmission(opts: {
  id: string; userId: string; userName: string; role: UserRole; timestamp: string;
  roster: DailyFoodHandlerRosterEntry[];
}): Submission {
  return {
    id: opts.id,
    userId: opts.userId,
    userName: opts.userName,
    role: opts.role,
    siteId: SITE_ID,
    siteName: SITE_NAME,
    timestamp: opts.timestamp,
    type: 'DAILY_FOOD_HANDLER',
    status: 'APPROVED',
    items: [],
    score: scoreRoster(opts.roster.map(r => r.readyToWork)),
    meta: {
      areaAudited: SITE_NAME,
      roster: opts.roster,
      checkedBy: opts.userName,
      acknowledgedBy: 'Ratna Kusuma',
      verifiedBy: 'Hendra Saputra',
    },
  };
}

export const INITIAL_SUBMISSIONS_DFH: Submission[] = [
  dfhSubmission({
    id: 'seed-dfh-1', userId: 'u-fs-sup-1', userName: 'Hendra Saputra', role: 'FOOD_SAFETY_SUPERVISOR', timestamp: daysAgo(1, 6, 30),
    roster: [
      dfhRosterEntry(1, 'Made Wirawan', 'Cook', true),
      dfhRosterEntry(2, 'Nur Fadillah', 'Steward', true),
      dfhRosterEntry(3, 'Wayan Sudarma', 'Cook', true),
    ],
  }),
  dfhSubmission({
    id: 'seed-dfh-2', userId: 'u-fs-sup-1', userName: 'Hendra Saputra', role: 'FOOD_SAFETY_SUPERVISOR', timestamp: daysAgo(0, 6, 30),
    roster: [
      dfhRosterEntry(1, 'Made Wirawan', 'Cook', true),
      dfhRosterEntry(2, 'Nur Fadillah', 'Steward', false, 'Hair not tied back — sent to fix and re-check.'),
      dfhRosterEntry(3, 'Wayan Sudarma', 'Cook', true),
      dfhRosterEntry(4, 'Kadek Puspita', 'Steward', true),
    ],
  }),
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  ...INITIAL_SUBMISSIONS_HOUSEKEEPING,
  ...INITIAL_SUBMISSIONS_FOOD_SAFETY_LOGS,
  ...INITIAL_SUBMISSIONS_FSI,
  ...INITIAL_SUBMISSIONS_GEMBA,
  ...INITIAL_SUBMISSIONS_DFH,
].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const TRAINING_MODULES: TrainingModule[] = [
  { id: 'seed-train-1', title: 'Room Cleaning Standard', description: 'Step-by-step standard for turning over a guest room to spec.', type: 'PDF', completedBy: ['u-hk-1'] },
  { id: 'seed-train-2', title: 'Food Safety Fundamentals', description: 'HACCP basics and the PSU food handling SOP, in short video form.', type: 'VIDEO', completedBy: ['u-fs-tech-1', 'u-fs-tech-2'] },
  { id: 'seed-train-3', title: 'PPE & Personal Hygiene Refresher', description: 'Slide deck covering the wellness/hygiene/PPE self-check criteria.', type: 'SLIDES', completedBy: [] },
];

export const INITIAL_WARNINGS: Warning[] = [
  {
    id: 'seed-warn-1',
    technicianId: 'u-fs-tech-2',
    technicianName: 'Nur Fadillah',
    supervisorId: 'u-fs-sup-1',
    reason: 'Missed core temperature log twice this week — please double-check before submitting.',
    severity: 'LOW',
    timestamp: daysAgo(3, 14),
  },
];
