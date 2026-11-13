import { TEMP_CONTROL_SLOTS, TEMP_CONTROL_ASSETS } from '../../../data/tempControlAssets';
import {
  B, C, CC, PaperHeader, PrintPage, PrintSheetProps, ControlledCopy, Check, SigBlock,
  daysInMonth, monthLabel, initials,
} from './paperShared';

// UF.10000 Temperature Control Checklist — replica of the paper pad: one
// sheet per container per MONTH, 31 day rows × five check times (08.00,
// 12.00, 16.00, 20.00, 24.00), each with a PARAF column. The app stores one
// submission per container per day, so this gathers every day of the
// printed submission's month for the same container.
export function TempControlPrintSheet({ submission, allSubmissions = [] }: PrintSheetProps) {
  const month = (submission.meta?.date || submission.timestamp).slice(0, 7);
  const assetId = submission.meta?.assetId;
  const asset = TEMP_CONTROL_ASSETS.find(a => a.id === assetId);
  const kind = submission.meta?.storeKind || asset?.kind;
  const days = daysInMonth(month);

  const byDay = new Map<number, typeof submission>();
  for (const s of [...allSubmissions, submission]) {
    if (s.type !== 'TEMP_CONTROL' || s.meta?.assetId !== assetId || s.siteId !== submission.siteId) continue;
    const d = s.meta?.date;
    if (!d || !d.startsWith(month)) continue;
    byDay.set(Number(d.slice(8, 10)), s);
  }
  const reviewer = submission.meta?.signoff?.checkedBy || submission.meta?.signoff?.approvedBy || submission.meta?.signoff?.verifiedBy;

  return (
    <PrintPage fontSize={8.5}>
      <div className={B}>
        <PaperHeader
          title={<>TEMPERATURE CONTROL<br /><br />CHECKLIST</>}
          titleSize={14}
          logoHeight={46}
          docRows={[
            ['No. Dokumen', 'UF.10000'],
            ['Tgl. Review', '01 Januari 2026'],
            ['Tgl. Terbit', '01 Januari 2000'],
            ['Tgl. Revisi/ No.', '01 Januari 2026 / 07'],
            ['Lokasi / Departemen', 'Catering & Commercial'],
          ]}
          docWidth="38%"
        />

        <div className="flex px-2 pt-2 gap-4">
          <table className="border-collapse" style={{ width: '62%' }}>
            <tbody>
              <tr><td className="font-bold pr-2" style={{ width: '58%' }}>BULAN</td><td>: {monthLabel(month)}</td></tr>
              <tr><td className="font-bold pr-2">CONTAINER/ROOM/CABINET NUMBER</td><td>: {submission.meta?.assetName || asset?.name || ''}</td></tr>
              <tr><td className="font-bold pr-2">LOCATION:</td><td>: {asset?.locationLabel || submission.siteName}</td></tr>
            </tbody>
          </table>
          <div className="flex gap-3 items-start">
            <div className="font-bold leading-tight">TYPE<br />STORE</div>
            <table className="border-collapse">
              <tbody>
                <tr><td className="pr-1"><Check on={kind === 'dry'} /></td><td className="pr-3">Temp. Dry</td><td>: ≤ 25°C</td></tr>
                <tr><td className="pr-1"><Check on={kind === 'freezer'} /></td><td className="pr-3">Temp. Freezer</td><td>: -18 °C</td></tr>
                <tr><td className="pr-1"><Check on={kind === 'chiller'} /></td><td className="pr-3">Temp. Chiller</td><td>: ≤ 4°C</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-2 py-1" style={{ fontSize: '7.5px' }}>
          <b>Note: Jika suhu berada di atas suhu standar di bawah ini, pastikan dilakukan pemeriksaan terhadap kondisi fisik produk di bawah ini:</b>
          <div className="pl-4">1. Frozen : Tidak ada tanda-tanda produk mengalami pelumeran dan tanda-tanda kerusakan bahan / Still hard frozen &amp; no signs of deterioration.</div>
          <div className="pl-4">2. Chiller : Tidak ada tanda kerusakan bahan / No signs of deterioration</div>
        </div>

        <div className="px-2 pb-2">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th rowSpan={2} className={CC} style={{ width: '6%' }}>DATE</th>
                <th colSpan={10} className={CC}>TEMPERATURE CHECK</th>
                <th rowSpan={2} className={CC} style={{ width: '14%' }}>REMARKS</th>
              </tr>
              <tr>
                {TEMP_CONTROL_SLOTS.flatMap(sl => [
                  <th key={sl} className={CC}>{sl}.00</th>,
                  <th key={sl + 'p'} className={CC}>PARAF</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const s = day <= days ? byDay.get(day) : undefined;
                return (
                  <tr key={day} style={{ height: 15 }}>
                    <td className={CC + ' font-bold'}>{day}</td>
                    {TEMP_CONTROL_SLOTS.flatMap(sl => {
                      const r = s?.meta?.tempReadings?.[sl];
                      return [
                        <td key={sl} className={CC}>{r?.temp ?? ''}</td>,
                        <td key={sl + 'p'} className={CC} style={{ fontSize: '7px' }}>{initials(r?.by)}</td>,
                      ];
                    })}
                    <td className={C} style={{ fontSize: '7px' }}>{s?.meta?.dayRemarks || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between px-10 pt-3 pb-1">
            <SigBlock heading="Mengetahui," role="Pengawas/Process Owner" name={reviewer?.name} at={reviewer?.at} align="center" />
            <SigBlock heading="Yang mengerjakan," role={' '} name={submission.meta?.signoff?.draftedBy?.name || submission.userName} align="center" />
          </div>
        </div>
      </div>
      <div className="mt-1"><ControlledCopy /></div>
    </PrintPage>
  );
}
