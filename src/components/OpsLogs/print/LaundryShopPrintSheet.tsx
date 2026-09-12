import { Submission } from '../../../types';
import { LAUNDRY_GARMENT_COLUMNS } from '../../../data/laundryShopData';
import { OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

const CELL = 'border border-black px-0.5 py-0.5 align-middle text-center';

// Daily Check List — Laundryshop. Full per-garment column table straight
// off meta.laundryRows (the one Ops Log type that keeps its raw
// structured counts, not just a formatted summary — see
// LaundryShopForm.tsx). Landscape: 28 garment columns match the paper
// left-to-right exactly (laundryShopData.ts).
export function LaundryShopPrintSheet({ submission }: { submission: Submission }) {
  const rows = submission.meta?.laundryRows || [];

  return (
    <div className="text-black" style={{ fontSize: '6.5px', lineHeight: 1.2 }}>
      <style>{`@page { size: landscape; margin: 8mm; }`}</style>
      <OpsPrintHeader
        title="Daily Check List — Laundryshop"
        formId="UN.00-LAUNDRY"
        submission={submission}
        extra={submission.meta?.laundryDate ? [{ label: 'Date', value: submission.meta.laundryDate }] : undefined}
      />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '6%' }}>Room</th>
            {LAUNDRY_GARMENT_COLUMNS.map((g) => (
              <th key={g.id} className={CELL} style={{ writingMode: 'vertical-rl', height: '56px' }}>{g.labelEn}</th>
            ))}
            <th className={CELL} style={{ width: '10%' }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={CELL}>{r.roomNumber}</td>
              {LAUNDRY_GARMENT_COLUMNS.map((g) => (
                <td key={g.id} className={CELL}>{r.counts[g.id] || ''}</td>
              ))}
              <td className={CELL} style={{ textAlign: 'left' }}>{r.keterangan}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className={CELL} colSpan={LAUNDRY_GARMENT_COLUMNS.length + 2}>—</td></tr>
          )}
        </tbody>
      </table>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
