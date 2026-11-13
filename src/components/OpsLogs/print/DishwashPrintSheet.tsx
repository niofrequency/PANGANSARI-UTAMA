import { DISHWASH_ROUNDS, DISHWASH_LOCATIONS } from '../../../data/dishwashData';
import { B, C, CC, PaperLogo, PrintPage, PrintSheetProps, SigBlock, daysInMonth, monthLabel, initials } from './paperShared';

const ROUND_LABEL: Record<string, string> = { '07': 'Pagi (07.00)', '12': 'Siang (12.00)', '18': 'Malam (18.00)' };
const HEAD_BG = '#cfe2f3';

// UN.00.51 Monitoring Suhu Diswashing Mesin — replica of the paper pad: one
// sheet per machine/location per MONTH, 31 day rows × three rounds (Pagi
// 07.00, Siang 12.00, Malam 18.00), each Bilas / Cuci / Sign. The app keeps
// one submission per location per day, so this gathers the whole month.
export function DishwashPrintSheet({ submission, allSubmissions = [] }: PrintSheetProps) {
  const month = (submission.meta?.date || submission.timestamp).slice(0, 7);
  const assetId = submission.meta?.assetId;
  const location = DISHWASH_LOCATIONS.find(l => l.id === assetId);
  const days = daysInMonth(month);

  const byDay = new Map<number, typeof submission>();
  for (const s of [...allSubmissions, submission]) {
    if (s.type !== 'DISHWASH_TEMP' || s.meta?.assetId !== assetId || s.siteId !== submission.siteId) continue;
    const d = s.meta?.date;
    if (!d || !d.startsWith(month)) continue;
    byDay.set(Number(d.slice(8, 10)), s);
  }
  const reviewer = submission.meta?.signoff?.checkedBy || submission.meta?.signoff?.approvedBy || submission.meta?.signoff?.verifiedBy;

  const docRows: [string, string][] = [
    ['No. Dokumen', 'UN.00.51'],
    ['Tgl Terbit', '22 Agustus 2007'],
    ['Tgl Revisi/No', '01 Januari 2019/00'],
    ['Tgl Review', '01 Januari 2019'],
    ['Lokasi/Departemen', 'Catering & Commercial'],
  ];

  return (
    <PrintPage fontSize={9}>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className={B + ' p-1 text-center align-middle'} style={{ width: '20%' }} rowSpan={2}><PaperLogo height={56} /></td>
            <td className={B + ' text-center align-middle font-black'} style={{ fontSize: 20, lineHeight: 1.15 }}>
              Monitoring Suhu<br />Diswashing Mesin
            </td>
            <td className={B + ' p-0 align-top'} style={{ width: '34%' }}>
              <table className="w-full border-collapse">
                <tbody>
                  {docRows.map(([k, v], i) => (
                    <tr key={k}>
                      <td className={(i ? 'border-t ' : '') + 'border-black border-r px-1'} style={{ width: '46%' }}>{k}</td>
                      <td className={(i ? 'border-t ' : '') + 'border-black px-1'}>: {v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className={B + ' px-1 align-top'}>
              <table><tbody>
                <tr><td className="font-bold pr-3">Month</td><td>: {monthLabel(month)}</td></tr>
                <tr><td className="font-bold pr-3">Location</td><td>: {submission.meta?.assetName || location?.name || submission.siteName}</td></tr>
              </tbody></table>
            </td>
            <td className={B + ' px-1 align-top font-bold'}>
              <u>Temperatur Limit</u><br />
              Pencucian : Min 60° C<br />
              Pembilasan : Min 80° C
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse mt-1" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: HEAD_BG }}>
            <th rowSpan={2} className={CC} style={{ width: '6%' }}>Date</th>
            {DISHWASH_ROUNDS.map(r => <th key={r} colSpan={3} className={CC}>{ROUND_LABEL[r]}</th>)}
            <th rowSpan={2} className={CC} style={{ width: '15%' }}>Keterangan</th>
          </tr>
          <tr style={{ background: HEAD_BG }}>
            {DISHWASH_ROUNDS.flatMap(r => [
              <th key={r + 'b'} className={CC} style={{ fontSize: '7.5px' }}>°C/F (Bilas)</th>,
              <th key={r + 'c'} className={CC} style={{ fontSize: '7.5px' }}>°C/F (Cuci)</th>,
              <th key={r + 's'} className={CC} style={{ fontSize: '7.5px' }}>Sign</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
            const s = day <= days ? byDay.get(day) : undefined;
            return (
              <tr key={day} style={{ height: 17 }}>
                <td className={CC}>{day}</td>
                {DISHWASH_ROUNDS.flatMap(r => {
                  const v = s?.meta?.dishwashReadings?.[r];
                  return [
                    <td key={r + 'b'} className={CC}>{v?.bilas ?? ''}</td>,
                    <td key={r + 'c'} className={CC}>{v?.cuci ?? ''}</td>,
                    <td key={r + 's'} className={CC} style={{ fontSize: '7px' }}>{initials(v?.by)}</td>,
                  ];
                })}
                <td className={C} style={{ fontSize: '7px' }}>{s?.meta?.dayRemarks || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-between px-6 pt-4">
        <SigBlock heading="Mengetahui :" role="Pengawas/Process Owner" name={reviewer?.name} at={reviewer?.at} />
        <SigBlock heading="Petugas:" role={' '} name={submission.meta?.signoff?.draftedBy?.name || submission.userName} />
      </div>
    </PrintPage>
  );
}
