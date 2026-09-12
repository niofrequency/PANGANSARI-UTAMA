import { Fragment } from 'react';
import { Submission } from '../../../types';
import { ROOM_CLEANING_GROUPS, itemsForGroup } from '../../../data/roomCleaningData';
import { CELL, OpsPrintSignoff } from './opsPrintShared';

// UN.00.65 Daily Check List — Room Cleaning. One submission = one room,
// today (see roomCleaningData.ts's header comment on why this app doesn't
// reproduce the paper's 31-day-per-room grid) — grouped here by the same
// 6 areas the paper uses.
export function RoomCleaningPrintSheet({ submission }: { submission: Submission }) {
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));
  const dateText = new Date(submission.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <div className="mb-2">
        <h1 className="font-black" style={{ fontSize: '13px' }}>Daily Check List — Room Cleaning</h1>
        <table className="w-full border-collapse mt-1">
          <tbody>
            <tr>
              <td className={CELL + ' font-bold'} style={{ width: '12%' }}>Site</td>
              <td className={CELL}>{submission.siteName}</td>
              <td className={CELL + ' font-bold'} style={{ width: '12%' }}>Date</td>
              <td className={CELL}>{dateText}</td>
            </tr>
            <tr>
              <td className={CELL + ' font-bold'}>Barak</td>
              <td className={CELL}>{submission.meta?.barak || ''}</td>
              <td className={CELL + ' font-bold'}>Room</td>
              <td className={CELL}>{submission.meta?.roomId || ''}</td>
            </tr>
            <tr>
              <td className={CELL + ' font-bold'}>Room Boy</td>
              <td className={CELL} colSpan={3}>{submission.userName}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '5%' }}>No</th>
            <th className={CELL} style={{ width: '50%' }}>Activity</th>
            <th className={CELL} style={{ width: '10%' }}>Done</th>
            <th className={CELL} style={{ width: '35%' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {ROOM_CLEANING_GROUPS.map((g) => (
            <Fragment key={g.key}>
              <tr>
                <td colSpan={4} className={CELL + ' font-black'} style={{ background: '#ddd' }}>
                  {g.key} — {g.titleId} / {g.titleEn}
                </td>
              </tr>
              {itemsForGroup(g.key).map((it) => {
                const subm = itemsById.get(it.id);
                return (
                  <tr key={it.id}>
                    <td className={CELL}>{it.id}</td>
                    <td className={CELL}>
                      {it.labelId}<div className="italic">{it.labelEn}</div>
                      {it.cadence !== 'daily' && <div style={{ fontSize: '6.5px' }}>({it.cadence})</div>}
                    </td>
                    <td className={CELL + ' text-center font-black'}>{subm?.answer ? 'Y' : 'T'}</td>
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
