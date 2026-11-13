import { Fragment } from 'react';
import { Submission } from '../../../types';
import { MEAL_PERIODS, INSTALLATION_CODES } from '../../../data/cookingServiceData';
import { B, C, CC, PaperLogo, PrintPage, PrintSheetProps, SigBlock, longDate, submissionDate } from './paperShared';

type Cell = { cookTime: string; cookTemp: string; installTime: string; installTemp: string; installCode: string; recipe: string };

// Paper row order: 1 APPETIZER (a. Soups), 2 MAINCOURSE (a–f), 3 RICE,
// 4 BUBUR, 5 PASTA.
const SECTIONS: { no: string; title: string; rows: { id: string; label: string }[] }[] = [
  { no: '1', title: 'APPETIZER', rows: [{ id: 'soups', label: 'a. Soups' }] },
  {
    no: '2', title: 'MAINCOURSE', rows: [
      { id: 'meat', label: 'a. Meat/Pork' },
      { id: 'poultry', label: 'b. Poultry' },
      { id: 'egg', label: 'c. Egg Dish' },
      { id: 'fish', label: 'd. Fish' },
      { id: 'vegetables', label: 'e. Vegetables' },
      { id: 'potatoes', label: 'f. Potatoes' },
    ],
  },
  { no: '3', title: 'RICE', rows: [{ id: 'rice', label: '' }] },
  { no: '4', title: 'BUBUR', rows: [{ id: 'bubur', label: '' }] },
  { no: '5', title: 'PASTA', rows: [{ id: 'pasta', label: '' }] },
];

// Older submissions only kept formatted strings — "80°C @ 04:00" and
// "Install: 90°C @ 06:00 · Bainmarie" — so pull the numbers back out.
function readCells(s: Submission): Record<string, Record<string, Cell>> {
  if (s.meta?.cookingRows) return s.meta.cookingRows as Record<string, Record<string, Cell>>;
  const out: Record<string, Record<string, Cell>> = {};
  for (const it of s.items) {
    const [meal, row] = it.id.split('.');
    if (!meal || !row) continue;
    const a = String(it.answer ?? '');
    const cook = a.match(/(-?[\d.]+)°C @ ([\d:-]+)/);
    const inst = (it.remarks || '').match(/(-?[\d.]+)°C @ ([\d:-]+)/);
    const code = INSTALLATION_CODES.find(c => (it.remarks || '').includes(c.labelId))?.id || '';
    (out[meal] ||= {})[row] = {
      cookTemp: cook?.[1] || '', cookTime: cook?.[2]?.replace('--:--', '') || '',
      installTemp: inst?.[1] || '', installTime: inst?.[2]?.replace('--:--', '') || '',
      installCode: code, recipe: cook ? '' : a,
    };
  }
  return out;
}

// UF.09001 Cooking & Service Checklist — replica of the paper sheet.
export function CookingServicePrintSheet({ submission }: PrintSheetProps) {
  const cells = readCells(submission);
  const sign = submission.meta?.signoff;
  const get = (meal: string, row: string): Cell | undefined => cells[meal]?.[row];

  return (
    <PrintPage landscape fontSize={8}>
      <div className={B}>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className="border-r border-b border-black p-1 text-center" style={{ width: '13%' }}><PaperLogo height={30} /></td>
              <td className="border-r border-b border-black p-1 align-top" rowSpan={2}>
                <div className="text-center font-black" style={{ fontSize: 15 }}>COOKING &amp; SERVICE CHECKLIST</div>
                <div className="border-t border-black mt-1 pt-0.5" style={{ fontSize: '7.5px' }}>
                  1. Temperature for cooked meals must be greater than 75 °C, and holding time minimum 20 seconds, or<br />
                  2. For Commercial specific orders, Organoleptic Control can be applied (OC) by √ IF OK or X if not OK. ( APPEARANCE, COLOR, TEXTUR, AROMA, TASTE)
                </div>
              </td>
              <td className="border-r border-b border-black p-1 align-top" rowSpan={2} style={{ width: '18%' }}>
                Installation Code No.:
                {INSTALLATION_CODES.map((c, i) => (
                  <div key={c.id} className="flex justify-between">
                    <span>{String.fromCharCode(97 + i)}. {c.labelEn}</span>
                    <span className="border border-black px-1.5">{c.id}</span>
                  </div>
                ))}
              </td>
              <td className="border-b border-black p-1 align-top" style={{ width: '17%' }}>
                <div className="text-right">Menu Cycle<br />(See Attached)</div>
              </td>
            </tr>
            <tr>
              <td className="border-r border-b border-black p-1 font-bold">LOCATION: <span className="font-normal">{submission.siteName}</span></td>
              <td className="border-b border-black p-1">Date: {longDate(submissionDate(submission))}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th rowSpan={3} className={CC} style={{ width: '3%' }}>NO</th>
              <th rowSpan={3} className={CC} style={{ width: '11%' }}>MEAL<br />COMPOSITION</th>
              {MEAL_PERIODS.map(m => <th key={m.id} colSpan={4} className={CC}>{m.labelEn.toUpperCase()}</th>)}
              <th rowSpan={2} className={CC} style={{ width: '8%' }}>INSTALLATION<br />CODES NO.</th>
              <th colSpan={2} className={CC} style={{ width: '13%' }}>STANDARD RECIPE</th>
            </tr>
            <tr>
              {MEAL_PERIODS.flatMap(m => [
                <th key={m.id + 'e'} colSpan={2} className={CC} style={{ fontSize: '6.5px' }}>End of Cooking</th>,
                <th key={m.id + 'i'} colSpan={2} className={CC} style={{ fontSize: '6.5px' }}>Installation</th>,
              ])}
              <th rowSpan={2} className={CC}>Menu</th>
              <th rowSpan={2} className={CC}>Remark</th>
            </tr>
            <tr>
              {MEAL_PERIODS.flatMap(m => [
                <th key={m.id + '1'} className={CC} style={{ fontSize: '6.5px' }}>Time</th>,
                <th key={m.id + '2'} className={CC} style={{ fontSize: '6.5px' }}>°C/ OC</th>,
                <th key={m.id + '3'} className={CC} style={{ fontSize: '6.5px' }}>Time</th>,
                <th key={m.id + '4'} className={CC} style={{ fontSize: '6.5px' }}>°C</th>,
              ])}
              <th className={CC} style={{ fontSize: '6px' }}>( Lingkari salah satu)</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(sec => (
              <Fragment key={sec.no}>
                {sec.rows.length > 1 && (
                  <tr>
                    <td className={CC + ' font-bold'}>{sec.no}</td>
                    <td colSpan={2 + MEAL_PERIODS.length * 4 + 2} className={C + ' font-bold'}>{sec.title}</td>
                  </tr>
                )}
                {sec.rows.map(r => {
                  const codes = new Set(MEAL_PERIODS.map(m => get(m.id, r.id)?.installCode).filter(Boolean));
                  const recipes = MEAL_PERIODS.map(m => get(m.id, r.id)?.recipe).filter(Boolean);
                  const allCooked = MEAL_PERIODS.map(m => get(m.id, r.id)?.cookTemp).filter(Boolean).map(Number);
                  const ok = allCooked.length > 0 && allCooked.every(n => n >= 75);
                  return (
                    <tr key={r.id} style={{ height: sec.rows.length > 1 ? 16 : 26 }}>
                      {sec.rows.length > 1 ? <td className={C} /> : <td className={CC + ' font-bold'}>{sec.no}</td>}
                      <td className={C + (sec.rows.length > 1 ? '' : ' font-bold')}>{sec.rows.length > 1 ? r.label : sec.title}</td>
                      {MEAL_PERIODS.flatMap(m => {
                        const c = get(m.id, r.id);
                        return [
                          <td key={m.id + '1'} className={CC}>{c?.cookTime || ''}</td>,
                          <td key={m.id + '2'} className={CC}>{c?.cookTemp || ''}</td>,
                          <td key={m.id + '3'} className={CC}>{c?.installTime || ''}</td>,
                          <td key={m.id + '4'} className={CC}>{c?.installTemp || ''}</td>,
                        ];
                      })}
                      <td className={CC}>
                        {['1', '2', '3'].map((n, i) => (
                          <Fragment key={n}>
                            {i > 0 && ' / '}
                            <span style={codes.has(n) ? { border: '1px solid black', borderRadius: '50%', padding: '0 3px' } : undefined}>{n}</span>
                          </Fragment>
                        ))}
                      </td>
                      <td className={C} style={{ fontSize: '7px' }}>{recipes.join(', ')}</td>
                      <td className={CC}>{allCooked.length ? (ok ? '√' : 'X') : ''}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between px-10 pt-2 pb-1">
          <SigBlock heading="Approved by," name={sign?.approvedBy?.name || sign?.verifiedBy?.name} at={sign?.approvedBy?.at || sign?.verifiedBy?.at} />
          <SigBlock heading="Reviewed by," name={sign?.checkedBy?.name} at={sign?.checkedBy?.at} />
          <SigBlock heading="Prepared by," name={sign?.draftedBy?.name || submission.userName} at={sign?.draftedBy?.at} />
        </div>
        <div className="flex justify-between border-t border-black px-1 font-bold">
          <span>Form No.: UF.09001</span><span>Revisi No.: 06</span><span>Date : 01 Oktober 2025</span>
        </div>
      </div>
    </PrintPage>
  );
}
