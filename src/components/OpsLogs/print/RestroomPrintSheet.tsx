import { Fragment } from 'react';
import { Submission } from '../../../types';
import { RESTROOM_GROUPS } from '../../../data/restroomData';
import { CELL, OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

// UN.00.45 Pembersihan Toilet — one submission = one slot (08:00/11:00/
// 16:00) for one section. Rows grouped by the paper's own two mark
// families (cleanliness vs supplies).
export function RestroomPrintSheet({ submission }: { submission: Submission }) {
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));
  const slot = submission.meta?.slot;
  const section = submission.meta?.section;

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader
        title="Pembersihan Toilet (Restroom Cleaning)"
        formId="UN.00.45"
        submission={submission}
        extra={[
          ...(section ? [{ label: 'Lokasi / Section', value: section }] : []),
          ...(slot ? [{ label: 'Slot', value: `${slot}:00` }] : []),
        ]}
      />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '50%' }}>Item</th>
            <th className={CELL} style={{ width: '20%' }}>Mark</th>
            <th className={CELL} style={{ width: '30%' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {RESTROOM_GROUPS.map((g) => (
            <Fragment key={g.key}>
              <tr>
                <td colSpan={3} className={CELL + ' font-black'} style={{ background: '#ddd' }}>
                  {g.titleId} / {g.titleEn} ({g.marks.join('/')})
                </td>
              </tr>
              {g.items.map((it) => {
                const subm = itemsById.get(it.id);
                return (
                  <tr key={it.id}>
                    <td className={CELL}>{it.labelId}<div className="italic">{it.labelEn}</div></td>
                    <td className={CELL + ' text-center font-black'}>{subm?.answer ? String(subm.answer) : ''}</td>
                    <td className={CELL}>{subm?.remarks || ''}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
