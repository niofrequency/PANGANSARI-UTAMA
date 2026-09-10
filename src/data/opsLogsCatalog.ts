// Shared registry for the additional operations logs
// (PSU_Additional_Ops_Forms_PRD.md). Each entry drives the "Ops Logs"
// picker/queue screens (OpsLogsTab.tsx) in the Supervisor and Manager
// portals, and the dedicated worker portals (LaundryStaffPortal.tsx,
// JanitorPortal.tsx) — so the list of forms and who owns them lives in
// exactly one place.
//
// UF.10000 (Temperature Control) and UN.00.51 (Dishwashing Temp) were
// removed from every worker-facing portal by request — frontline staff
// don't need to see them. See git history for the removed
// TempControlForm.tsx / DishwashForm.tsx if they're ever wanted back.

import { OpsLogType, Submission, UserRole } from '../types';

export type SignoffStep = 'checkedBy' | 'approvedBy' | 'verifiedBy';

// Every submission type that goes through a named sign-off chain instead
// of a plain Approve/Reject click — the 7 Ops Log types, plus the 3 types
// that used to be reviewed through the separate "Escalations" system
// (Technician's daily Food Safety log, Housekeeper's Room Cleaning, and
// Gemba Walk). Escalations and Ops Logs are now the same mechanism: every
// submission has a chain, some chains are just one step long. See
// SupervisorPortal.tsx / ManagerPortal.tsx's shared review queue.
export type SignoffChainType = OpsLogType | 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'GEMBA_WALK';

// Which named stamps a form's paper sign-off chain uses, in order.
// draftedBy is always set automatically at submit time (the logged-in
// submitter), so it's never listed here. The LAST entry is the stamp that
// flips a submission from PENDING to APPROVED — see
// useAppStore.ts's addSignoffStamp(). A Reject at any step (see
// rejectSignoff()) sends it back to the submitter instead of advancing;
// resubmitting (resubmitAfterRejection()) always restarts the chain from
// the first step, regardless of how far it had gotten.
export const SIGNOFF_CHAINS: Record<SignoffChainType, SignoffStep[]> = {
  MESS_HALL_HYGIENE: ['checkedBy', 'approvedBy', 'verifiedBy'],
  COOKING_SERVICE: ['checkedBy', 'approvedBy'],
  HOT_PACKED_MEAL: ['checkedBy', 'approvedBy'],
  THAWING: ['checkedBy', 'verifiedBy'],
  STAFF_READY: ['approvedBy', 'verifiedBy'],
  LAUNDRY_SHOP: ['checkedBy', 'approvedBy'],
  RESTROOM: ['checkedBy'],
  // Technician's daily log and Housekeeper's Room Cleaning: Supervisor
  // checks it, then Manager approves it — strictly in that order.
  FOOD_SAFETY: ['checkedBy', 'approvedBy'],
  HOUSEKEEPING: ['checkedBy', 'approvedBy'],
  // Gemba Walk: the Supervisor IS the filer (draftedBy), so there's no
  // separate "checked" step — it goes straight to their Manager/Assistant
  // Manager for approval. See InspectionsTab.tsx.
  GEMBA_WALK: ['approvedBy'],
};

export type OpsDepartment = 'HOUSEKEEPING' | 'FOOD_SAFETY';

export interface OpsLogDef {
  type: OpsLogType;
  formId: string;
  department: OpsDepartment;
  titleKey: string; // i18n key, ops.<form>.title
  descKey: string;  // i18n key, ops.<form>.desc
  // Who can open the fill screen for this form, on top of it appearing in
  // the right department's portal at all.
  fillerRoles: Array<'FOOD_SAFETY_TECHNICIAN' | 'FOOD_SAFETY_SUPERVISOR' | 'HOUSEKEEPING_LAUNDRY' | 'HOUSEKEEPING_JANITOR'>;
}

export const OPS_LOG_DEFS: OpsLogDef[] = [
  {
    type: 'MESS_HALL_HYGIENE', formId: 'UWL10001', department: 'FOOD_SAFETY',
    titleKey: 'ops.messHall.title', descKey: 'ops.messHall.desc',
    fillerRoles: ['FOOD_SAFETY_SUPERVISOR'],
  },
  {
    type: 'COOKING_SERVICE', formId: 'UF.09001', department: 'FOOD_SAFETY',
    titleKey: 'ops.cookingService.title', descKey: 'ops.cookingService.desc',
    fillerRoles: ['FOOD_SAFETY_SUPERVISOR'],
  },
  {
    type: 'HOT_PACKED_MEAL', formId: 'UF.09000', department: 'FOOD_SAFETY',
    titleKey: 'ops.hotPacked.title', descKey: 'ops.hotPacked.desc',
    fillerRoles: ['FOOD_SAFETY_SUPERVISOR'],
  },
  {
    type: 'THAWING', formId: 'UN.00.43', department: 'FOOD_SAFETY',
    titleKey: 'ops.thawing.title', descKey: 'ops.thawing.desc',
    fillerRoles: ['FOOD_SAFETY_SUPERVISOR'],
  },
  {
    type: 'STAFF_READY', formId: 'STAFF_READY', department: 'FOOD_SAFETY',
    titleKey: 'ops.staffReady.title', descKey: 'ops.staffReady.desc',
    fillerRoles: ['FOOD_SAFETY_SUPERVISOR'],
  },
  {
    // Filled only by the dedicated Laundry Staff portal now — not shown
    // on the room-cleaning Housekeeper's own task list.
    type: 'LAUNDRY_SHOP', formId: 'UN.00-LAUNDRY', department: 'HOUSEKEEPING',
    titleKey: 'ops.laundryShop.title', descKey: 'ops.laundryShop.desc',
    fillerRoles: ['HOUSEKEEPING_LAUNDRY'],
  },
  {
    // Filled only by the dedicated Bathroom Janitor portal now — not
    // shown on the room-cleaning Housekeeper's own task list.
    type: 'RESTROOM', formId: 'UN.00.45', department: 'HOUSEKEEPING',
    titleKey: 'ops.restroom.title', descKey: 'ops.restroom.desc',
    fillerRoles: ['HOUSEKEEPING_JANITOR'],
  },
];

export function opsLogDef(type: OpsLogType): OpsLogDef {
  const def = OPS_LOG_DEFS.find(d => d.type === type);
  if (!def) throw new Error(`Unknown OpsLogType: ${type}`);
  return def;
}

// The 3 types that used to be reviewed through the separate "Escalations"
// system, now sharing the same review queue as the 7 Ops Log types above
// (see SIGNOFF_CHAINS). Each is still filled through its own dedicated
// portal — TechnicianPortal, HousekeeperPortal, InspectionsTab — not
// through Ops Logs' own picker, so these have no fillerRoles/form
// component the way OPS_LOG_DEFS entries do; this just tells the review
// queue what to display for them.
export type ReviewOnlyType = 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'GEMBA_WALK';

export const REVIEW_ONLY_TITLE_KEY: Record<ReviewOnlyType, string> = {
  FOOD_SAFETY: 'technician.dailyLogTitle',
  HOUSEKEEPING: 'housekeeper.today',
  GEMBA_WALK: 'inspection.pickerGemba',
};

// Gemba Walk is the one type that belongs to either department depending
// on who filed it (see GembaWalkForm.tsx's `sections` split), rather than
// having one fixed department the way every other type does.
export const HOUSEKEEPING_GEMBA_ROLES: UserRole[] = ['HOUSEKEEPING_SUPERVISOR', 'HOUSEKEEPING_MANAGER'];

// Display title for any of the 10 sign-off-chain types — shared by
// OpsLogsTab.tsx's queue/history and the notification bell (Layout.tsx)
// so both name a submission the same way. Falls back to undefined for
// anything else (the two self-contained audit types, or an unrecognized
// type), same as the two call sites already handled before this existed.
export function titleKeyForChainType(type: Submission['type']): string | undefined {
  return OPS_LOG_DEFS.find(d => d.type === type)?.titleKey ?? REVIEW_ONLY_TITLE_KEY[type as ReviewOnlyType];
}

// Which department a submission belongs to, for review-queue scoping —
// covers every type that goes through a sign-off chain. Returns undefined
// for the two audit types that stay self-contained inside InspectionsTab
// (FOOD_SAFETY_INSPECTION, DAILY_FOOD_HANDLER) and never join a review
// queue at all.
export function departmentOf(s: Pick<Submission, 'type' | 'role'>): OpsDepartment | undefined {
  if (s.type === 'GEMBA_WALK') return HOUSEKEEPING_GEMBA_ROLES.includes(s.role) ? 'HOUSEKEEPING' : 'FOOD_SAFETY';
  if (s.type === 'HOUSEKEEPING' || s.type === 'FOOD_SAFETY') return s.type;
  return OPS_LOG_DEFS.find(d => d.type === s.type)?.department;
}
