import { Submission } from '../../../types';
import { DAILY_FOOD_HANDLER_GROUPS } from '../../../data/dailyFoodHandlerData';
import { CELL, OpsPrintHeader, OpsPrintSignoff } from './opsPrintShared';

// Food Safety Technician's daily log — 3 fixed readings (fridge temp, core
// cooking temp, area clean) plus the same 19-point wellness/hygiene/PPE
// self-check as the Daily Food Handler Assessment (one person, not a
// roster — see TechnicianPortal.tsx). Item ids 1/2/3 are the fixed
// readings; everything after that matches DAILY_FOOD_HANDLER_ALL_CRITERIA.
export function FoodSafetyDailyLogPrintSheet({ submission }: { submission: Submission }) {
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader title="Food Safety Technician's Daily Log" formId="FOOD_SAFETY" submission={submission} />

      <table className="w-full border-collapse mb-2">
        <tbody>
          <tr>
            <td className={CELL + ' font-bold'} style={{ width: '25%' }}>{itemsById.get('1')?.question}</td>
            <td className={CELL}>{String(itemsById.get('1')?.answer ?? '')}</td>
            <td className={CELL + ' font-bold'} style={{ width: '25%' }}>{itemsById.get('2')?.question}</td>
            <td className={CELL}>{String(itemsById.get('2')?.answer ?? '')}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>{itemsById.get('3')?.question}</td>
            <td className={CELL} colSpan={3}>{String(itemsById.get('3')?.answer ?? '')}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '20%' }}>Group</th>
            <th className={CELL} style={{ width: '50%' }}>Item</th>
            <th className={CELL} style={{ width: '10%' }}>Mark</th>
          </tr>
        </thead>
        <tbody>
          {DAILY_FOOD_HANDLER_GROUPS.map((g) => (
            g.criteria.map((c, idx) => {
              const subm = itemsById.get(c.id);
              return (
                <tr key={c.id}>
                  {idx === 0 && <td rowSpan={g.criteria.length} className={CELL + ' font-black align-top'}>{g.titleEn}</td>}
                  <td className={CELL}>{c.labelEn || c.labelId}{c.labelEn && <div className="italic">{c.labelId}</div>}</td>
                  <td className={CELL + ' text-center font-black'}>{subm?.answer === true ? 'v' : subm?.answer === false ? 'x' : ''}</td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
