import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from './dailyFoodHandlerData';

// The source's own legend for this column (row 32): "Hygiene Personal : (v)
// Good/ appropriate as standard, (x) not appropriate with standard" — on
// the real paper form this is a blank cell filled in by hand. This app
// instead gives the Supervisor a Check/X button pair per criterion, same
// as the Technician's own wellness self-check (TechnicianPortal.tsx),
// which always sets exactly "v" or "x" — no free text, no typos to
// misread. isGoodMark() still just checks for "v" (case/whitespace
// tolerant) rather than requiring the literal button values, so any mark
// recorded before this UI existed still reads correctly.
export function isGoodMark(mark?: string): boolean {
  return (mark || '').trim().toLowerCase() === 'v';
}

// The source template has no formula at all — every cell, including
// "Ready to Work", is filled in by hand. This app computes "Ready to Work"
// rather than asking for it separately: a "v" on every one of the 19
// criteria. That's this app's own rule, not something read off the
// workbook — flagged here for the same reason as the Inspection
// Checklist's scoring assumption.
export function computeReadyToWork(marks: Record<string, string>): boolean {
  return DAILY_FOOD_HANDLER_ALL_CRITERIA.every(c => isGoodMark(marks[c.id]));
}

export function countMarked(marks: Record<string, string>): number {
  return DAILY_FOOD_HANDLER_ALL_CRITERIA.filter(c => (marks[c.id] || '').trim().length > 0).length;
}

// Submission-level score: % of the roster that's ready to work. Lets this
// checklist type participate in the same average-score dashboard as every
// other submission type without special-casing it there.
export function scoreRoster(readyFlags: boolean[]): number | undefined {
  if (readyFlags.length === 0) return undefined;
  return Math.round((readyFlags.filter(Boolean).length / readyFlags.length) * 100);
}
