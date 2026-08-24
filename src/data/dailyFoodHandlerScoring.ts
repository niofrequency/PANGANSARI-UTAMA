import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from './dailyFoodHandlerData';

// The source's own legend for this column (row 32): "Hygiene Personal : (v)
// Good/ appropriate as standard, (x) not appropriate with standard" — on
// the real form this is a blank cell the food handler writes into by hand,
// not a pick-list, so this app takes free text too rather than forcing a
// Good/Not Good toggle. Whatever gets typed still has to collapse to a
// yes/no for "Ready to Work": only a "v" (case- and whitespace-insensitive)
// counts as Good, matching the source legend exactly; anything else that's
// been filled in (an "x", or anything else someone writes) counts as Not
// Good.
export function isGoodMark(mark?: string): boolean {
  return (mark || '').trim().toLowerCase() === 'v';
}

// The flip side of accepting free text: nothing stops someone typing a
// perfectly reasonable word — "good", "ok", a stray character — that
// isn't the source's own "v". That silently scores as Not Good, same as
// a deliberate "x", with nothing distinguishing "I meant Good and typed
// the wrong thing" from "I meant Not Good" — on a form whose whole point
// is flagging when someone might not be fit to handle food, so a typo
// reading as the opposite of what was meant is a real problem, not a
// cosmetic one. This tells the UI when a mark is filled in but isn't
// either character the form actually expects, so it can warn instead of
// quietly treating it as a deliberate "x".
export function isUnrecognizedMark(mark?: string): boolean {
  const trimmed = (mark || '').trim().toLowerCase();
  return trimmed.length > 0 && trimmed !== 'v' && trimmed !== 'x';
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
