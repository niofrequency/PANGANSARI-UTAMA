import { Submission } from '../../../types';
import { HOT_PACK_MEAL_PERIODS, HOT_PACK_TYPES } from '../../../data/hotPackedMealData';
import { B, C, CC, PaperLogo, PrintPage, PrintSheetProps, ControlledCopy, Check, SigBlock, longDate, submissionDate } from './paperShared';

type Cell = { cookTime: string; cookTemp: string; holdTime: string; holdTemp: string; packStart: string; packFinish: string; packOk: boolean | null };

// Paper rows: 1 RICE, 2 MAINCOURSE a. Meat / b. Chicken / c. Fish /
// d. Vegetables, then blank rows 3 and 4 for anything else.
const ROWS: { no: string; comp: string; desc: string; id: string | null }[] = [
  { no: '1', comp: 'RICE', desc: '', id: 'rice' },
  { no: '2', comp: 'MAINCOURSE', desc: 'a. Meat', id: 'meat' },
  { no: '', comp: '', desc: 'b. Chicken', id: 'chicken' },
  { no: '', comp: '', desc: 'c. Fish', id: 'fish' },
  { no: '', comp: '', desc: 'd. Vegetables', id: 'vegetables' },
  { no: '3', comp: '', desc: '', id: null },
  { no: '', comp: '', desc: '', id: null },
  { no: '4', comp: '', desc: '', id: null },
  { no: '', comp: '', desc: '', id: null },
];

const T = (v?: string) => (v || '').replace('--:--', '');

// Older submissions only kept formatted strings — parse them back.
function readCells(s: Submission): Record<string, Record<string, Cell>> {
  if (s.meta?.hotPackRows) return s.meta.hotPackRows as Record<string, Record<string, Cell>>;
  const out: Record<string, Record<string, Cell>> = {};
  for (const it of s.items) {
    const [meal, row] = it.id.split('.');
    if (!meal || !row) continue;
    const cook = String(it.answer ?? '').match(/(-?[\d.]+)°C @ ([\d:-]+)/);
    const rem = it.remarks || '';
    const hold = rem.match(/:\s*(-?[\d.]+)°C @ ([\d:-]+)/);
    const pack = rem.match(/([\d:-]{4,5})–([\d:-]{4,5})/);
    (out[meal] ||= {})[row] = {
      cookTemp: cook?.[1] || '', cookTime: T(cook?.[2]),
      holdTemp: hold?.[1] || '', holdTime: T(hold?.[2]),
      packStart: T(pack?.[1]), packFinish: T(pack?.[2]),
      packOk: null,
    };
  }
  return out;
}

// UF.09000 Hot "Packed" Meal Checklist — replica of the paper sheet.
export function HotPackedMealPrintSheet({ submission }: PrintSheetProps) {
  const cells = readCells(submission);
  const sign = submission.meta?.signoff;
  const packType = submission.meta?.packType;
  const H = { fontSize: '6px' } as const;

  return (
    <PrintPage landscape fontSize={7.5}>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className={B + ' text-center align-middle p-1'} style={{ width: '11%' }}>
              <div className="flex justify-center" style={{ height: 30, marginBottom: 2 }}><PaperLogo height={30} /></div>
              <div className="font-bold" style={{ fontSize: '7px' }}>HOT "PACKED"<br />MEAL CHECKLIST</div>
            </td>
            <td className={B + ' align-top px-1'} style={{ width: '22%' }}>
              <div className="text-center">Type Of Food Pack</div>
              {HOT_PACK_TYPES.map(p => (
                <div key={p.id} className="flex items-center gap-2" style={{ fontSize: '7.5px' }}>
                  <span style={{ width: 10 }}>{p.id}</span><span style={{ width: 90 }}>: {p.labelEn}</span><Check on={packType === p.id} />
                </div>
              ))}
            </td>
            <td className={B + ' align-top px-1'} style={{ width: '27%' }}>
              <div className="text-center">Menu Cycle<br /><i>(See Attached)</i></div>
              <div>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {longDate(submissionDate(submission))}</div>
              <div>Location : {submission.siteName}</div>
            </td>
            <td className={B + ' p-0 align-top'}>
              <table className="w-full border-collapse">
                <tbody>
                  {([
                    ['Dokumen No', 'UF.09000'],
                    ['Tgl. Terbit', '01 Desember 2004'],
                    ['Tgl.Revisi/No', '01 Januari 2026/ 05'],
                    ['Tgl. Review', '01 Januari 2026'],
                    ['Lokasi/Departemen', 'Catering & Commercial'],
                  ] as const).map(([k, v], i) => (
                    <tr key={k}>
                      <td className={(i ? 'border-t ' : '') + 'border-black border-r px-1'} style={{ width: '45%' }}>{k}</td>
                      <td className={(i ? 'border-t ' : '') + 'border-black px-1'}>: {v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th rowSpan={3} className={CC} style={{ width: '2.5%' }}>NO</th>
            <th rowSpan={3} className={CC} style={{ width: '7%' }}>Meal<br />Composition</th>
            <th rowSpan={3} className={CC} style={{ width: '6.5%' }}>Descriptions</th>
            {HOT_PACK_MEAL_PERIODS.map(m => <th key={m.id} colSpan={7} className={CC}>{m.labelEn.toUpperCase()}</th>)}
          </tr>
          <tr>
            {HOT_PACK_MEAL_PERIODS.flatMap(m => [
              <th key={m.id + 'c'} colSpan={2} className={CC} style={H}>Cooking</th>,
              <th key={m.id + 'h'} colSpan={2} className={CC} style={H}>Holding/<br />Installation</th>,
              <th key={m.id + 'p'} colSpan={3} className={CC} style={H}>Packing</th>,
            ])}
          </tr>
          <tr>
            {HOT_PACK_MEAL_PERIODS.flatMap(m => [
              <th key={m.id + '1'} className={CC} style={H}>Time</th>,
              <th key={m.id + '2'} className={CC} style={H}>°C</th>,
              <th key={m.id + '3'} className={CC} style={H}>Time</th>,
              <th key={m.id + '4'} className={CC} style={H}>°C</th>,
              <th key={m.id + '5'} className={CC} style={H}>Time Start</th>,
              <th key={m.id + '6'} className={CC} style={H}>Time Finish</th>,
              <th key={m.id + '7'} className={CC} style={H}>ORLEP<br />(√/X)</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={i} style={{ height: 15 }}>
              <td className={CC + ' font-bold'}>{r.no}</td>
              <td className={C + ' font-bold'} style={{ fontSize: '6.5px' }}>{r.comp}</td>
              <td className={C} style={{ fontSize: '6.5px' }}>{r.desc}</td>
              {HOT_PACK_MEAL_PERIODS.flatMap(m => {
                const c = r.id ? cells[m.id]?.[r.id] : undefined;
                return [
                  <td key={m.id + '1'} className={CC}>{c?.cookTime || ''}</td>,
                  <td key={m.id + '2'} className={CC}>{c?.cookTemp || ''}</td>,
                  <td key={m.id + '3'} className={CC}>{c?.holdTime || ''}</td>,
                  <td key={m.id + '4'} className={CC}>{c?.holdTemp || ''}</td>,
                  <td key={m.id + '5'} className={CC}>{c?.packStart || ''}</td>,
                  <td key={m.id + '6'} className={CC}>{c?.packFinish || ''}</td>,
                  <td key={m.id + '7'} className={CC}>{c?.packOk === true ? '√' : c?.packOk === false ? 'X' : ''}</td>,
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={B + ' border-t-0 flex items-start justify-between px-3 pt-2 pb-2 gap-4'}>
        <div className="pt-4"><ControlledCopy /></div>
        <SigBlock heading="Approved by," name={sign?.approvedBy?.name || sign?.verifiedBy?.name} at={sign?.approvedBy?.at || sign?.verifiedBy?.at} align="center" />
        <SigBlock heading="Reviewed by," name={sign?.checkedBy?.name} at={sign?.checkedBy?.at} align="center" />
        <div className={B + ' px-2 py-1'} style={{ width: '30%' }}>
          1. Temperature for cooked meals must be greater than 75 °C<br />
          2. Do the organoleptic Test&nbsp; by √ IF OK or X if not OK. ( APPEARANCE, COLOR, TEXTUR, AROMA, TASTE)
        </div>
        <SigBlock heading="Delivered by," name={sign?.draftedBy?.name || submission.userName} at={sign?.draftedBy?.at} align="center" />
      </div>
    </PrintPage>
  );
}
