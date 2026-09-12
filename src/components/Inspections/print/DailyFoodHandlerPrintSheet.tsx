import { Submission } from '../../../types';
import {
  DAILY_FOOD_HANDLER_GROUPS,
  DFH_FORM_TITLE,
  DFH_SIGNOFF_LABELS,
  DFH_MARK_LEGEND,
} from '../../../data/dailyFoodHandlerData';

// Pixel-replica print output for a Daily Food Handler Assessment Checklist
// submission — a plain black-on-white wide table matching
// Form_Daily_Food_Handler_Assessment_Checklist.xlsx (see
// dailyFoodHandlerData.ts for exactly which cells each piece comes from),
// not this screen's own per-worker card UI. Landscape, since the source
// is 19 mark columns wide. Only ever rendered inside a `hidden
// print:block` wrapper (see DailyFoodHandlerReportView.tsx).
const CELL = 'border border-black px-1 py-0.5 align-middle text-center';

export function DailyFoodHandlerPrintSheet({ submission }: { submission: Submission }) {
  const meta = submission.meta || {};
  const roster = meta.roster || [];
  const dateText = new Date(submission.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="text-black" style={{ fontSize: '7px', lineHeight: 1.2 }}>
      <style>{`@page { size: landscape; margin: 8mm; }`}</style>

      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-black" style={{ fontSize: '12px' }}>{DFH_FORM_TITLE}</h1>
        <div style={{ fontSize: '8px' }}>
          <span className="font-bold">Location:</span> {meta.areaAudited || submission.siteName || ''}
          &nbsp;&nbsp;&nbsp;<span className="font-bold">Date:</span> {dateText}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} rowSpan={2} style={{ width: '2%' }}>No.</th>
            <th className={CELL} rowSpan={2} style={{ width: '8%' }}>Name</th>
            <th className={CELL} rowSpan={2} style={{ width: '6%' }}>Position</th>
            {DAILY_FOOD_HANDLER_GROUPS.map((g) => (
              <th key={g.key} colSpan={g.criteria.length} className={CELL + ' font-black'}>
                {g.titleEn}
              </th>
            ))}
            <th className={CELL} rowSpan={2} style={{ width: '5%' }}>
              Ready to Work
              <div className="font-normal">(Ya/Tidak)</div>
            </th>
            <th className={CELL} rowSpan={2} style={{ width: '10%' }}>Remark</th>
          </tr>
          <tr>
            {DAILY_FOOD_HANDLER_GROUPS.flatMap((g) => g.criteria).map((c) => (
              <th key={c.id} className={CELL} style={{ writingMode: 'vertical-rl', height: '58px' }}>
                {c.labelEn || c.labelId}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((entry) => (
            <tr key={entry.no}>
              <td className={CELL}>{entry.no}</td>
              <td className={CELL} style={{ textAlign: 'left' }}>{entry.name}</td>
              <td className={CELL} style={{ textAlign: 'left' }}>{entry.position}</td>
              {DAILY_FOOD_HANDLER_GROUPS.flatMap((g) => g.criteria).map((c) => (
                <td key={c.id} className={CELL}>{entry.marks[c.id] || ''}</td>
              ))}
              <td className={CELL + ' font-bold'}>{entry.readyToWork ? 'Ya' : 'Tidak'}</td>
              <td className={CELL} style={{ textAlign: 'left' }}>{entry.remark || ''}</td>
            </tr>
          ))}
          {roster.length === 0 && (
            <tr>
              <td className={CELL} colSpan={19 + 5}>—</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="mt-1" style={{ fontSize: '7px' }}>{DFH_MARK_LEGEND}</p>

      <table className="w-full border-collapse mt-4" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            {(['checkedBy', 'acknowledgedBy', 'verifiedBy'] as const).map((key) => (
              <td key={key} className="align-top px-2" style={{ width: '33%' }}>
                <p style={{ fontSize: '8px' }}>{DFH_SIGNOFF_LABELS[key].title}</p>
                <div style={{ height: '32px' }} />
                <p className="border-t border-black" style={{ fontSize: '8px' }}>
                  {meta[key] || ''}
                  <br />
                  {DFH_SIGNOFF_LABELS[key].role}
                </p>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
