import { Fragment } from 'react';
import { Submission } from '../../../types';
import { THAWING_METHODS, THAW_PRODUCT_CATEGORIES } from '../../../data/thawingData';
import { C, CC, PaperLogo, PrintPage, PrintSheetProps, ControlledCopy, submissionDate, monthLabel } from './paperShared';

type Batch = { category: string; qty: string; startTime: string; endTime: string; endTempC: string; usedFor: string[] };

const SECTION_LABEL: Record<string, string> = {
  poultry: 'POULTRY', meat: 'MEAT', fish: 'FISH AND SEAFOOD', precooked: 'PRE-COOKED', other: 'LAIN-LAIN',
};
const DAY_BG = '#9fc5e8';
const BLOCK_COLS = 9; // Jlh, Jam Mulai, Selesai (Tgl, Jam, Suhu Produk, Metoda), Digunakan utk Tgl (B, L, D)

function readBatches(s: Submission): Batch[] {
  if (s.meta?.thawRows) return s.meta.thawRows as Batch[];
  // Older submissions: question "Unggas — 5 kg", answer "3°C",
  // remarks "08:00–10:00 · B/L".
  return s.items.map(it => {
    const [catLabel, qty = ''] = it.question.split(' — ');
    const cat = THAW_PRODUCT_CATEGORIES.find(c => c.labelId === catLabel.trim())?.id || 'other';
    const time = (it.remarks || '').match(/([\d:-]{4,5})–([\d:-]{4,5})/);
    const used = (it.remarks || '').split(' · ').find(p => /^[BLD](\/[BLD])*$/.test(p));
    return {
      category: cat, qty,
      startTime: (time?.[1] || '').replace('--:--', ''), endTime: (time?.[2] || '').replace('--:--', ''),
      endTempC: String(it.answer ?? '').replace('°C', ''),
      usedFor: used ? used.split('/') : [],
    };
  });
}

function addDays(yyyyMmDd: string, n: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// UN.00.43 Checklist Pemantauan Pencairan Bahan Beku (Checklist of Thawing
// Process) — replica of the landscape paper: product groups down the side
// (Poultry, Meat, Fish and Seafood, Pre-cooked, Lain-lain) and four day
// blocks across. Prints the day of the selected submission plus the next
// three days, filled from every thawing log at the same site.
export function ThawingPrintSheet({ submission, allSubmissions = [] }: PrintSheetProps) {
  const start = submissionDate(submission);
  const dates = [0, 1, 2, 3].map(n => addDays(start, n));

  const perDay = dates.map(date => {
    const subs = [...allSubmissions.filter(s => s.id !== submission.id), submission].filter(
      s => s.type === 'THAWING' && s.siteId === submission.siteId && submissionDate(s) === date,
    );
    return subs.flatMap(s => readBatches(s).map(b => ({ ...b, method: s.meta?.thawMethod || '' })));
  });
  const methodsUsed = new Set(perDay.flat().map(b => b.method));

  const sections = THAW_PRODUCT_CATEGORIES.map(cat => {
    const counts = perDay.map(day => day.filter(b => b.category === cat.id).length);
    return { cat, rows: Math.max(cat.id === 'other' ? 3 : 5, ...counts) };
  });
  const H = { fontSize: '6px', lineHeight: 1.1 } as const;

  return (
    <PrintPage landscape fontSize={7}>
      <div className="flex items-start">
        <div style={{ width: '12%' }}><PaperLogo height={30} /></div>
        <div className="flex-1 text-center">
          <div className="font-black" style={{ fontSize: 12 }}>CHECKLIST PEMANTAUAN PENCAIRAN BAHAN BEKU</div>
          <div className="italic font-bold" style={{ fontSize: 9 }}>(CHECKLIST OF THAWING PROCESS)</div>
        </div>
        <table className="border border-black" style={{ width: '22%', fontSize: '7px' }}>
          <tbody>
            {([
              ['No. Dokumen', 'UN.00.43'],
              ['No. Revisi / Tgl.Revisi', '01-10-2025/06'],
              ['Tgl Terbit', '01-07-2006'],
              ['Tgl Review', '01-01-2026'],
              ['Dept. Pengguna', 'CAT. COM'],
            ] as const).map(([k, v]) => <tr key={k}><td className="px-1">{k}</td><td>: {v}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-6 mt-1 mb-1">
        <div style={{ width: '22%' }}>
          Lokasi/ <i>Location</i> : {submission.siteName}<br />
          Bulan/ <i>Month</i> : {monthLabel(start.slice(0, 7))}
        </div>
        <div className="flex gap-2">
          <span>Metode:</span>
          <div className="grid grid-cols-2 gap-x-6">
            {[THAWING_METHODS[0], THAWING_METHODS[2], THAWING_METHODS[1], THAWING_METHODS[3]].map(m => (
              <div key={m.id} className="flex items-center gap-1">
                <span className="border border-black px-1" style={{ background: methodsUsed.has(m.id) ? '#000' : undefined, color: methodsUsed.has(m.id) ? '#fff' : undefined }}>{m.id}</span>
                : {m.labelId}
              </div>
            ))}
          </div>
        </div>
        <div className="font-bold ml-auto">Note: Product Temperature ≤ 4 °C</div>
      </div>

      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th rowSpan={3} className={CC} style={{ width: '2%' }}>No</th>
            <th rowSpan={3} className={CC} style={{ width: '13%' }}>Nama Produk Thawing</th>
            {dates.map(d => (
              <Fragment key={d}>
                <th colSpan={2} className={CC} style={{ background: DAY_BG }}>{Number(d.slice(8))}</th>
                <th colSpan={BLOCK_COLS - 2} className={CC} />
              </Fragment>
            ))}
          </tr>
          <tr>
            {dates.map(d => (
              <Fragment key={d}>
                <th rowSpan={2} className={CC} style={H}>Jlh (Kg atau CT)</th>
                <th rowSpan={2} className={CC} style={H}>Jam Mulai</th>
                <th colSpan={4} className={CC} style={H}>Selesai</th>
                <th colSpan={3} className={CC} style={H}>Digunakan utk Tgl</th>
              </Fragment>
            ))}
          </tr>
          <tr>
            {dates.map(d => (
              <Fragment key={d}>
                <th className={CC} style={H}>Tgl</th>
                <th className={CC} style={H}>Jam</th>
                <th className={CC} style={H}>Suhu Produk</th>
                <th className={CC} style={H}>Me-toda</th>
                <th className={CC} style={H}>B</th>
                <th className={CC} style={H}>L</th>
                <th className={CC} style={H}>D</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map(({ cat, rows }) => (
            <Fragment key={cat.id}>
              <tr>
                <td className={C} />
                <td className={C + ' text-center font-bold underline'}>{SECTION_LABEL[cat.id]}</td>
                {dates.map(d => <td key={d} colSpan={BLOCK_COLS} className={C} />)}
              </tr>
              {Array.from({ length: rows }, (_, k) => (
                <tr key={k} style={{ height: 12 }}>
                  <td className={CC} />
                  <td className={C} />
                  {dates.map((d, di) => {
                    const b = perDay[di].filter(x => x.category === cat.id)[k];
                    return (
                      <Fragment key={d}>
                        <td className={CC}>{b?.qty || ''}</td>
                        <td className={CC}>{b?.startTime || ''}</td>
                        <td className={CC}>{b ? Number(d.slice(8)) : ''}</td>
                        <td className={CC}>{b?.endTime || ''}</td>
                        <td className={CC}>{b?.endTempC || ''}</td>
                        <td className={CC}>{b?.method || ''}</td>
                        {(['B', 'L', 'D'] as const).map(x => <td key={x} className={CC}>{b?.usedFor.includes(x) ? '✓' : ''}</td>)}
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
          <tr>
            <td colSpan={2} className={C + ' font-bold underline'} style={{ fontSize: '6.5px' }}>PARAF/ ID (BUTCHER)/ COORD.-CHEF</td>
            {dates.map(d => <td key={d} colSpan={BLOCK_COLS} className={CC}>/</td>)}
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end px-8 pt-1">
        <div className="text-center">Dilaksanakan oleh,<div style={{ height: 18 }}>{submission.meta?.signoff?.draftedBy?.name || submission.userName}</div><u>(Nama/ No. ID)</u><br />Butcher/ Thawing Staff</div>
        <div className="text-center">Dicheck oleh,<div style={{ height: 18 }}>{submission.meta?.signoff?.checkedBy?.name || ''}</div><u>(Nama/ No. ID)</u><br />Coord/Chef/Area Manager</div>
        <div className="text-center">Diverifikasi oleh,<div style={{ height: 18 }}>{submission.meta?.signoff?.verifiedBy?.name || submission.meta?.signoff?.approvedBy?.name || ''}</div><u>(Nama/ No. ID)</u><br />QC/ QSHE</div>
        <ControlledCopy />
      </div>
    </PrintPage>
  );
}
