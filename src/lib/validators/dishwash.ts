// Zod schema for DishwashForm's (UN.00.51) save — same shape-check role
// as tempControl.ts's schema: the paper's actual limits (cuci >=60C,
// bilas >=80C) live in dishwashData.ts and drive the red out-of-range
// flag; this just guards that at least one round has a reading and every
// filled reading is a real number before the save goes through.
import { z } from 'zod';

const tempString = z.string().refine(
  (v) => v.trim() === '' || Number.isFinite(Number(v)),
  { message: 'Temperature must be a number' }
);

export const dishwashReadingsSchema = z.record(z.string(), z.object({
  cuci: tempString,
  bilas: tempString,
  at: z.string(),
  by: z.string(),
})).refine(
  (readings) => Object.values(readings).some((r) => r.cuci.trim() !== '' || r.bilas.trim() !== ''),
  { message: 'Enter at least one round’s reading before saving' }
);
