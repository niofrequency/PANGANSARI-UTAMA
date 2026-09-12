import { Fragment } from 'react';
import { Submission } from '../../../types';
import { HOT_PACK_MEAL_PERIODS, HOT_PACK_ROWS, HOT_PACK_TYPES } from '../../../data/hotPackedMealData';
import { CELL, OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

// UF.09000 Hot Packed Meal Checklist — same shape as Cooking & Service
// (item.id is "<meal>.<row>"), plus a pack type shown in the header.
export function HotPackedMealPrintSheet({ submission }: { submission: Submission }) {
  const mealPeriods = submission.meta?.mealPeriods || [];
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));
  const packType = HOT_PACK_TYPES.find((p) => p.id === submission.meta?.packType);

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader
        title="Hot Packed Meal Checklist"
        formId="UF.09000"
        submission={submission}
        extra={packType ? [{ label: 'Pack Type', value: `${packType.labelId} / ${packType.labelEn}` }] : undefined}
      />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '30%' }}>Item</th>
            <th className={CELL} style={{ width: '25%' }}>Cook Reading</th>
            <th className={CELL} style={{ width: '45%' }}>Holding / Packing / Notes</th>
          </tr>
        </thead>
        <tbody>
          {mealPeriods.map((meal) => {
            const mealLabel = HOT_PACK_MEAL_PERIODS.find((m) => m.id === meal);
            const rows = HOT_PACK_ROWS.filter((r) => itemsById.has(`${meal}.${r.id}`));
            if (rows.length === 0) return null;
            return (
              <Fragment key={meal}>
                <tr>
                  <td colSpan={3} className={CELL + ' font-black'} style={{ background: '#ddd' }}>
                    {mealLabel?.labelId} / {mealLabel?.labelEn}
                  </td>
                </tr>
                {rows.map((row) => {
                  const subm = itemsById.get(`${meal}.${row.id}`)!;
                  return (
                    <tr key={row.id}>
                      <td className={CELL}>{row.labelId}<div className="italic">{row.labelEn}</div></td>
                      <td className={CELL}>{String(subm.answer)}</td>
                      <td className={CELL}>{subm.remarks || ''}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
