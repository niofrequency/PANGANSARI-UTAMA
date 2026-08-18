import { InspectionSection } from './inspectionChecklistData';

// Scoring rules for the Food Safety Inspection Checklist.
//
// The source workbook ("GUIDELINES_FOOD_SAFETY_INSPECTION.xls") computes a
// per-row and per-section score with a hidden formula that couldn't be
// recovered from the .xls file (it ships as a legacy BIFF workbook — xlrd
// exposes cached values, not formula text, and the sheet we received had
// already been filled in and saved over, so only results were left, not the
// formula). What *is* explicit in the source is the meaning of each
// conformity mark (see the "Keterangan / Remarks" legend on the "Audit
// Check List" sheet):
//   A — system & control implemented, with written evidence (full credit)
//   B — implemented, but no evidence/records (partial credit)
//   C — not implemented (no credit)
//   N/A — not applicable (excluded from scoring entirely)
//
// From that legend, this app scores each item A=1, B=0.5, C=0, and drops
// N/A items from both the numerator and denominator. This is the natural
// reading of the legend but is this app's own choice, not a value taken
// from the workbook — flagged here so anyone reconciling scores against a
// paper copy of the audit knows where to look first.
export type ConformityCode = 'A' | 'B' | 'C' | 'NA';

export const CONFORMITY_WEIGHT: Record<ConformityCode, number | null> = {
  A: 1,
  B: 0.5,
  C: 0,
  NA: null, // excluded from scoring
};

export function scoreItems(codes: (ConformityCode | undefined)[]): { scorePct: number; answered: number; scored: number } {
  const answered = codes.filter((c): c is ConformityCode => c !== undefined).length;
  const scorable = codes.filter((c): c is ConformityCode => c !== undefined && c !== 'NA');
  if (scorable.length === 0) return { scorePct: 0, answered, scored: 0 };
  const total = scorable.reduce((sum, c) => sum + (CONFORMITY_WEIGHT[c] ?? 0), 0);
  return { scorePct: (total / scorable.length) * 100, answered, scored: scorable.length };
}

export interface PsuCategory {
  category: 'A' | 'B' | 'C' | 'D';
  status: string;
}

// Verbatim from the "Score" sheet's "PSU Categorisation: A-D" table. Rows
// with a blank Category cell in the source are vertically merged with the
// lettered row above them — Excel only stores a value in a merged range's
// top-left cell — so each letter below covers the full band from its own
// row down to the next lettered row.
const PSU_BANDS: { min: number; category: PsuCategory['category']; status: string }[] = [
  { min: 95, category: 'A', status: 'Excellent-Benchmark' },
  { min: 90, category: 'A', status: 'Very good' },
  { min: 85, category: 'B', status: 'Good, still (minor) improvements recommended' },
  { min: 80, category: 'C', status: 'Satisfactory, improvements recommended' },
  { min: 75, category: 'C', status: 'Improvements necessary' },
  { min: 50, category: 'D', status: 'Fundamental improvements necessary' },
  { min: 0, category: 'D', status: 'Does not meet basic requirement' },
];

export function getPsuCategory(scorePct: number): PsuCategory {
  const band = PSU_BANDS.find(b => scorePct >= b.min) ?? PSU_BANDS[PSU_BANDS.length - 1];
  return { category: band.category, status: band.status };
}

export function countTotalItems(sections: InspectionSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}
