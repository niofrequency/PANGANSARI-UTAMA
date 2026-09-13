// Zod schema for TempControlForm's (UF.10000) save — the paper's own
// limit per store kind (dry <=25C, freezer -18C, chiller <=4C) lives in
// tempControlAssets.ts's TEMP_LIMITS already (that's what drives the red
// out-of-range flag); this schema is just the shape check run right
// before a slot is saved: at least one slot actually has a reading, and
// every filled reading is a real, finite number — not "must be within
// limits," since an out-of-range reading is still a real reading that
// has to be recorded, just flagged.
import { z } from 'zod';

const tempString = z.string().refine(
  (v) => v.trim() === '' || Number.isFinite(Number(v)),
  { message: 'Temperature must be a number' }
);

export const tempControlReadingsSchema = z.record(z.string(), z.object({
  temp: tempString,
  at: z.string(),
  by: z.string(),
})).refine(
  (readings) => Object.values(readings).some((r) => r.temp.trim() !== ''),
  { message: 'Enter at least one slot’s temperature before saving' }
);
