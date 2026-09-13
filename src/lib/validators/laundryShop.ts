// Zod schema for LaundryShopForm's submit — the paper limits ("a room
// needs a number, a count can't be negative") in one place instead of
// scattered across UI-only checks. The form's own inline validation
// (invalidRowIds, disabling Submit) already keeps the UI from reaching a
// bad state in normal use; this is the authoritative last-mile guard run
// right before addSubmission/resubmitAfterRejection, same spirit as a
// server-side check even though there's no server here.
import { z } from 'zod';

// Stored as text ("blank = 0"), so the check is on the string itself: a
// count is either blank or a non-negative whole number — never negative,
// never a decimal, never garbage that slipped past the UI's own
// digit-only input filtering.
const countString = z.string().refine(
  (v) => v.trim() === '' || (/^\d+$/.test(v) && Number(v) >= 0),
  { message: 'Garment counts must be whole numbers, 0 or more' }
);

export const laundryRoomRowSchema = z.object({
  id: z.string(),
  roomNumber: z.string().trim().min(1, 'Room number is required'),
  counts: z.record(z.string(), countString),
  keterangan: z.string(),
}).refine(
  (row) => Object.values(row.counts).some((v) => Number(v) > 0),
  { message: 'At least one garment count is required per room' }
);

export const laundrySubmissionSchema = z.array(laundryRoomRowSchema).min(
  1, 'Add at least one room with a count before submitting'
);

export type LaundryRoomRowInput = z.infer<typeof laundryRoomRowSchema>;
