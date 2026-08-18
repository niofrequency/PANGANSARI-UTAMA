import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from './dailyFoodHandlerData';

// The source template has no formula at all — every cell, including
// "Ready to Work", is filled in by hand. This app computes "Ready to Work"
// rather than asking for it separately: GOOD on every one of the 19
// criteria (row 32's own legend: "(v) Good/ appropriate as standard, (x)
// not appropriate with standard"). That's this app's own rule, not
// something read off the workbook — flagged here for the same reason as
// the Inspection Checklist's scoring assumption.
export function computeReadyToWork(marks: Record<string, 'GOOD' | 'NOT_GOOD'>): boolean {
  return DAILY_FOOD_HANDLER_ALL_CRITERIA.every(c => marks[c.id] === 'GOOD');
}

export function countMarked(marks: Record<string, 'GOOD' | 'NOT_GOOD'>): number {
  return DAILY_FOOD_HANDLER_ALL_CRITERIA.filter(c => marks[c.id] !== undefined).length;
}

// Submission-level score: % of the roster that's ready to work. Lets this
// checklist type participate in the same average-score dashboard as every
// other submission type without special-casing it there.
export function scoreRoster(readyFlags: boolean[]): number | undefined {
  if (readyFlags.length === 0) return undefined;
  return Math.round((readyFlags.filter(Boolean).length / readyFlags.length) * 100);
}
