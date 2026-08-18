import { GembaEvaluation } from './gembaWalkData';

// Unlike the Food Safety Inspection Checklist, the GEMBA Walk source gives
// an explicit, recoverable formula for its COMPLIANCE % (GEMBA_WALK!E6,
// via Database!B15):
//
//   =Conform / (Conform + "Not Conform")
//
// (Database!B9/(B9+B10), where B9/B10 are COUNTIF(...,"Conform") and
// COUNTIF(...,"Not Conform") across both rule sections.) "Non Observed",
// "N/A", and blank items are counted (Database!B11-B13) but never appear in
// the denominator — they simply don't affect compliance %. No per-item
// partial credit and no A–D categorisation exists for this checklist in
// the source (that banding is specific to the Food Safety Inspection
// Checklist's own "Score" sheet) — this app doesn't invent one for GEMBA.
export function scoreGembaEvaluations(evaluations: (GembaEvaluation | undefined)[]): {
  answered: number;
  conform: number;
  notConform: number;
  nonObserved: number;
  na: number;
  compliancePct: number | null; // null when there's nothing to divide (no Conform/Not Conform answers yet)
} {
  let conform = 0, notConform = 0, nonObserved = 0, na = 0, answered = 0;
  for (const e of evaluations) {
    if (!e) continue;
    answered++;
    if (e === 'Conform') conform++;
    else if (e === 'Not Conform') notConform++;
    else if (e === 'Non Observed') nonObserved++;
    else if (e === 'N/A') na++;
  }
  const denom = conform + notConform;
  return { answered, conform, notConform, nonObserved, na, compliancePct: denom > 0 ? (conform / denom) * 100 : null };
}
