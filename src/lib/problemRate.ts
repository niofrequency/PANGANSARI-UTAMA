// What counts as "a problem" on a submission, for trend analytics
// (components/Dashboard/TrendsPanel.tsx). One definition for every form:
//   - sent back by a reviewer (REJECTED), or
//   - a reading outside its paper limit (temperature, dishwash, cooking/
//     hot-pack/thawing `outOfRange`), or
//   - a checklist item marked failed: false / "Tidak" / "Rusak" / "R".
import { Submission } from '../types';
import { TEMP_LIMITS } from '../data/tempControlAssets';
import { DISHWASH_MIN_BILAS_C, DISHWASH_MIN_CUCI_C } from '../data/dishwashData';

const FAIL_MARKS = new Set(['tidak', 'rusak', 'r', 'no', 'x']);

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function hasProblem(s: Submission): boolean {
  if (s.status === 'REJECTED') return true;
  const m = s.meta || {};
  if (m.outOfRange) return true;
  if (s.type === 'TEMP_CONTROL' && m.tempReadings && m.storeKind) {
    const limit = TEMP_LIMITS[m.storeKind];
    for (const r of Object.values(m.tempReadings)) {
      const c = num(r?.temp);
      if (c !== null && !limit.check(c)) return true;
    }
  }
  if (s.type === 'DISHWASH_TEMP' && m.dishwashReadings) {
    for (const r of Object.values(m.dishwashReadings)) {
      const cuci = num(r?.cuci), bilas = num(r?.bilas);
      if ((cuci !== null && cuci < DISHWASH_MIN_CUCI_C) || (bilas !== null && bilas < DISHWASH_MIN_BILAS_C)) return true;
    }
  }
  return (s.items || []).some((it) =>
    // Room Cleaning: an unticked item WITH a reason (occupied, no linen…)
    // is a logged exception, not a failure.
    (it.answer === false && !(s.type === 'HOUSEKEEPING' && it.remarks))
    || (typeof it.answer === 'string' && FAIL_MARKS.has(it.answer.trim().toLowerCase()))
  );
}
