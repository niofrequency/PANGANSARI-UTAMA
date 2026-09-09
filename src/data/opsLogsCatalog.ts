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

import { OpsLogType } from '../types';

export type SignoffStep = 'checkedBy' | 'approvedBy' | 'verifiedBy';

// Which named stamps a form's paper sign-off chain uses, in order.
// draftedBy is always set automatically at submit time (the logged-in
// submitter), so it's never listed here. The LAST entry is the stamp that
// flips a submission from PENDING to APPROVED — see
// useAppStore.ts's addSignoffStamp().
export const SIGNOFF_CHAINS: Record<OpsLogType, SignoffStep[]> = {
  MESS_HALL_HYGIENE: ['checkedBy', 'approvedBy', 'verifiedBy'],
  COOKING_SERVICE: ['checkedBy', 'approvedBy'],
  HOT_PACKED_MEAL: ['checkedBy', 'approvedBy'],
  THAWING: ['checkedBy', 'verifiedBy'],
  STAFF_READY: ['approvedBy', 'verifiedBy'],
  LAUNDRY_SHOP: ['checkedBy', 'approvedBy'],
  RESTROOM: ['checkedBy'],
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
