import { Submission } from '../../../types';
import { MESS_HALL_AREAS } from '../../../data/messHallHygieneData';
import { CELL, OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

// UWL10001 Checklist Kebersihan dan Perawatan Area Mess Hall.
export function MessHallHygienePrintSheet({ submission }: { submission: Submission }) {
  const area = MESS_HALL_AREAS.find((a) => a.key === submission.meta?.areaKey) || MESS_HALL_AREAS[0];
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader
        title="Checklist Kebersihan dan Perawatan Area Mess Hall"
        formId="UWL10001"
        submission={submission}
        extra={[{ label: 'Area', value: `${area.key} — ${area.titleId} / ${area.titleEn}` }]}
      />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '6%' }}>No</th>
            <th className={CELL} style={{ width: '54%' }}>Item</th>
            <th className={CELL} style={{ width: '10%' }}>Mark</th>
            <th className={CELL} style={{ width: '30%' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {area.items.map((it) => {
            const subm = itemsById.get(it.id);
            return (
              <tr key={it.id}>
                <td className={CELL}>{it.id}</td>
                <td className={CELL}>{it.labelId}<div className="italic">{it.labelEn}</div></td>
                <td className={CELL + ' text-center font-black'}>{subm?.answer ? String(subm.answer) : ''}</td>
                <td className={CELL}>{subm?.remarks || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1" style={{ fontSize: '7px' }}>Mark: B = Bersih/Baik (Clean/Good), R = Rusak (Damaged)</p>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
