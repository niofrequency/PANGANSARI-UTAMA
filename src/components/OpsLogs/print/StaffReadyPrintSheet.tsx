import { STAFF_READY_GROUPS } from '../../../data/staffReadyData';
import { B, C, CC, PaperLogo, PrintPage, PrintSheetProps, longDate, submissionDate } from './paperShared';

type Row = { name: string; gender?: string; position: string; marks: Record<string, string>; fhCardValid?: boolean; bodyTempC?: string; remark?: string };

const ROWS_PER_SHEET = 27;
// Paper column captions (upper-case, as printed).
const CAPTION: Record<string, string> = {
  uniform: 'UNIFORM', sepatu: 'SEPATU', topi: 'TOPI', dasi: 'DASI', apron: 'APRON', gloves: 'HAND GLOVE',
  bau_badan: 'BAU BADAN', rambut: 'RAMBUT', jenggot: 'JENGGOT', kumis: 'KUMIS', kuku_kotor: 'KUKU KOTOR', perhiasan: 'PERHIASAN',
  batuk: 'BATUK', pilek: 'PILEK', mata: 'MATA ( MERAH )', telinga: 'TELINGGA ( CAIRAN )', diare: 'DIARE', mual: 'MUAL & MUNTAH', kuku_kulit: 'KUKU & KULIT',
};

// Checklist Persiapan Diri Karyawan — replica of the landscape roster sheet
// (27 rows; Kelengkapan / Hygiene & Sanitasi / Penyakit columns, FH card,
// body temperature, keterangan). Older submissions only kept each person's
// overall pass/fail, so their per-item columns print blank.
export function StaffReadyPrintSheet({ submission }: PrintSheetProps) {
  const raw = submission.meta?.staffReadyRows as Row[] | undefined;
  const rows: Row[] = raw || submission.items.map(it => {
    const m = it.question.match(/^(.*) \((.*)\)$/);
    return { name: m?.[1] || it.question, position: m?.[2] || '', marks: {}, remark: it.remarks };
  });
  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_SHEET));
  const shift = submission.meta?.shift;
  const vertical = { writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '7px' } as const;
  const sign = submission.meta?.signoff;
  const approver = sign?.approvedBy || sign?.checkedBy;

  return (
    <PrintPage landscape fontSize={8}>
      {Array.from({ length: pages }, (_, p) => (
        <div key={p} style={{ pageBreakAfter: p < pages - 1 ? 'always' : undefined }}>
          <div className="flex items-start justify-between mb-1">
            <PaperLogo height={40} />
            <div className="font-bold pt-2" style={{ fontSize: 12 }}>CHECKLIST PERSIAPAN DIRI KARYAWAN</div>
            <div style={{ width: '24%' }}>
              <table className="border-collapse w-full">
                <tbody><tr>
                  <td className={B} style={{ width: 16, background: shift === 'day' ? '#000' : undefined }} />
                  <td className={B + ' px-1'}>DAY SHIFT</td>
                  <td className={B} style={{ width: 16, background: shift === 'night' ? '#000' : undefined }} />
                  <td className={B + ' px-1'}>NIGHT SHIFT</td>
                </tr></tbody>
              </table>
              <div className="mt-0.5">DATE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {longDate(submissionDate(submission))}</div>
              <div>LOKASI&nbsp;&nbsp;: {submission.siteName}</div>
            </div>
          </div>

          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th rowSpan={2} className={CC} style={{ width: '2.5%' }}>NO</th>
                <th rowSpan={2} className={CC} style={{ width: '14%' }}>NAMA</th>
                <th rowSpan={2} className={CC} style={{ width: '2.5%', height: 92 }}><span style={vertical}>JENIS KELAMIN</span></th>
                <th rowSpan={2} className={CC} style={{ width: '2.5%' }}><span style={vertical}>POSISI</span></th>
                {STAFF_READY_GROUPS.map(g => <th key={g.key} colSpan={g.items.length} className={CC}>{g.titleId.toUpperCase()}</th>)}
                <th rowSpan={2} className={CC} style={{ width: '2.8%' }}><span style={vertical}>FH CARD VALID</span></th>
                <th rowSpan={2} className={CC} style={{ width: '3.5%' }}><span style={vertical}>SUHU TUBUH</span></th>
                <th rowSpan={2} className={CC} style={{ width: '11%' }}>KETERANGAN</th>
              </tr>
              <tr>
                {STAFF_READY_GROUPS.flatMap(g => g.items.map(it => (
                  <th key={it.id} className={CC} style={{ height: 80 }}><span style={vertical}>{CAPTION[it.id] || it.labelId.toUpperCase()}</span></th>
                )))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS_PER_SHEET }, (_, i) => {
                const r = rows[p * ROWS_PER_SHEET + i];
                return (
                  <tr key={i} style={{ height: 13 }}>
                    <td className={CC}>{p * ROWS_PER_SHEET + i + 1}</td>
                    <td className={C} style={{ fontSize: '7.5px' }}>{r?.name || ''}</td>
                    <td className={CC}>{r?.gender || ''}</td>
                    <td className={CC}>{r?.position || ''}</td>
                    {STAFF_READY_GROUPS.flatMap(g => g.items.map(it => {
                      const v = r?.marks?.[it.id];
                      return <td key={it.id} className={CC + ' font-bold'} style={{ color: v && v !== g.passingMark ? '#c00' : undefined }}>{v || ''}</td>;
                    }))}
                    <td className={CC}>{r && raw ? (r.fhCardValid ? 'Y' : 'T') : ''}</td>
                    <td className={CC}>{r?.bodyTempC || ''}</td>
                    <td className={C} style={{ fontSize: '7px' }}>{r?.remark || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={B + ' border-t-0 flex items-end justify-between px-4 py-1'} style={{ minHeight: 70 }}>
            <div>Approve by : {approver?.name || ''}</div>
            <div className="flex gap-16 self-start">
              <div><i>Keterangan :</i><div className="pl-8">Y = Ya<br />T = Tidak<br />B = Baik<br />C = Cukup<br />J = Jelek</div></div>
              <div>C = Cook<br />AC = Asst Cook<br />MA = Mess Attendent<br />GP = General Purpose</div>
            </div>
            <div className="self-center">QHSE PSU by : {sign?.verifiedBy?.name || ''}</div>
          </div>
        </div>
      ))}
    </PrintPage>
  );
}
