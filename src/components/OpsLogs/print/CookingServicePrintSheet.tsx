import { Fragment } from 'react';
import { Submission } from '../../../types';
import { MEAL_PERIODS, COOKING_SERVICE_ROWS, COOK_MIN_TEMP_C } from '../../../data/cookingServiceData';
import { CELL, OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

// UF.09001 Cooking & Service Checklist rev 06 — rows grouped by meal
// period (item.id is "<meal>.<row>"). Cook reading and installation/
// out-of-range notes are already merged into one Reading/Notes pair per
// row by the fill form (see opsPrintShared.tsx's header comment) rather
// than separate Cook Temp/Time and Install Temp/Time/Code columns.
export function CookingServicePrintSheet({ submission }: { submission: Submission }) {
  const mealPeriods = submission.meta?.mealPeriods || [];
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader title="Cooking & Service Checklist" formId="UF.09001" submission={submission} />
      <p className="mb-1" style={{ fontSize: '7px' }}>Minimum cooked temperature: {COOK_MIN_TEMP_C}°C, held ≥20 seconds.</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '30%' }}>Recipe</th>
            <th className={CELL} style={{ width: '25%' }}>Cook Reading</th>
            <th className={CELL} style={{ width: '45%' }}>Installation / Notes</th>
          </tr>
        </thead>
        <tbody>
          {mealPeriods.map((meal) => {
            const mealLabel = MEAL_PERIODS.find((m) => m.id === meal);
            const rows = COOKING_SERVICE_ROWS.filter((r) => itemsById.has(`${meal}.${r.id}`));
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
