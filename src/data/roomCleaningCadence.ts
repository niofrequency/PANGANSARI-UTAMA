// Cadence rules for the UN.00.65 checklist (roomCleaningData.ts): decides
// which weekly/monthly items are actually "due" for a given room today,
// based on this device's own submission history — submissions are always
// localStorage (see useAppStore.ts), so this is per-browser, not a
// cross-device source of truth, but it's the only history the app has in
// this version.
//
// "Successful" here means the room boy actually checked the item off in a
// past submission for this exact room — not that a Supervisor has approved
// it yet. HOUSEKEEPING submissions start PENDING and often sit there for a
// while; treating pending-but-checked as "not done" would make an item
// look due again just because nobody's reviewed it, which isn't what the
// paper form's weekly/monthly cadence means.

import { Submission } from '../types';

function submissionsForRoom(submissions: Submission[], barak: string, roomId: string): Submission[] {
  return submissions.filter(
    (s) => s.type === 'HOUSEKEEPING' && s.meta?.barak === barak && s.meta?.roomId === roomId
  );
}

function wasItemChecked(submission: Submission, itemId: string): boolean {
  return submission.items.some((i) => i.id === itemId && i.answer === true);
}

export function wasDoneWithinDays(
  submissions: Submission[],
  barak: string,
  roomId: string,
  itemId: string,
  days: number
): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return submissionsForRoom(submissions, barak, roomId).some(
    (s) => new Date(s.timestamp).getTime() >= cutoff && wasItemChecked(s, itemId)
  );
}

export function wasDoneThisCalendarMonth(
  submissions: Submission[],
  barak: string,
  roomId: string,
  itemId: string
): boolean {
  const now = new Date();
  return submissionsForRoom(submissions, barak, roomId).some((s) => {
    const d = new Date(s.timestamp);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && wasItemChecked(s, itemId);
  });
}
