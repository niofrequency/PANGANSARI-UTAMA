import { Fragment } from 'react';
import { Submission } from '../../../types';
import { RESTROOM_GROUPS, RESTROOM_SLOTS } from '../../../data/restroomData';
import { C, CC, PaperHeader, PrintPage, PrintSheetProps, submissionDate, initials } from './paperShared';

const BLOCKS_PER_PAGE = 6;
const MARK_LABEL: Record<string, string> = { bersih: 'Bersih', tersedia: 'Tersedia', tidak: 'Tidak', rusak: 'Rusak' };
// Paper captions for each item column.
const CAPTION: Record<string, string> = {
  wastafel: 'Washtafel', closet: 'Closet', lantai: 'Lantai', pintu: 'Pintu', urinal: 'Urinal', shower: 'Shower',
  dinding: 'Dinding, Fan, Cermin, Penerangan', tissue: 'Toilet Paper & Toilet Ball', handsoap: 'Handsoap',
};

// UN.00.45 Pembersihan Toilet — replica of the paper pad: six day blocks per
// sheet, each "Yang Mengerjakan … Paraf" over three times (08:00, 11:00,
// 16:00), with Bersih/Tidak/Rusak (or Tersedia/Tidak/Rusak) under every
// item. One app submission = one time slot, so this gathers every slot for
// the same site + section in the printed submission's month.
export function RestroomPrintSheet({ submission, allSubmissions = [] }: PrintSheetProps) {
  const section = submission.meta?.section || '';
  const month = submissionDate(submission).slice(0, 7);

  const byDate = new Map<string, Partial<Record<string, Submission>>>();
  for (const s of [...allSubmissions.filter(x => x.id !== submission.id), submission]) {
    if (s.type !== 'RESTROOM' || s.siteId !== submission.siteId || (s.meta?.section || '') !== section) continue;
    const d = submissionDate(s);
    if (!d.startsWith(month) || !s.meta?.slot) continue;
    byDate.set(d, { ...(byDate.get(d) || {}), [s.meta.slot]: s });
  }
  const dates = [...byDate.keys()].sort();
  const padded = [...dates, ...Array(Math.max(0, Math.ceil(Math.max(dates.length, 1) / BLOCKS_PER_PAGE) * BLOCKS_PER_PAGE - dates.length)).fill('')];
  const pages = Array.from({ length: padded.length / BLOCKS_PER_PAGE }, (_, i) => padded.slice(i * BLOCKS_PER_PAGE, (i + 1) * BLOCKS_PER_PAGE));
  const items = RESTROOM_GROUPS.flatMap(g => g.items.map(it => ({ ...it, marks: g.marks })));
  const sign = submission.meta?.signoff;
  const H = { fontSize: '6px' } as const;
  const totalCols = 2 + items.length * 3;

  return (
    <PrintPage landscape fontSize={7.5}>
      {pages.map((blockDates, p) => (
        <div key={p} style={{ pageBreakAfter: p < pages.length - 1 ? 'always' : undefined }}>
          <PaperHeader
            title="Pembersihan Toilet"
            titleSize={12}
            logoHeight={30}
            docWidth="32%"
            docRows={[
              ['No. Dokumen', 'UN.00.45'],
              ['Tgl. Review', '-'],
              ['No./Tgl. Revisi', '01 / 01 September 2007'],
              ['Lokasi', 'Universal'],
              ['Departemen', 'HK & Catr'],
            ]}
          />
          <div className="flex justify-between py-0.5">
            <span><b>Lokasi :</b> {submission.siteName}{section ? ` — ${section}` : ''}</span>
            <span><b>Section :</b> {section}</span>
            <span><b>Diperiksa Oleh:</b> {sign?.checkedBy?.name || sign?.approvedBy?.name || ''}</span>
          </div>

          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th rowSpan={3} className={CC} style={{ width: '6%' }}>Tanggal</th>
                <th rowSpan={3} className={CC} style={{ width: '5%' }}>Pukul</th>
                {RESTROOM_GROUPS.map(g => (
                  <th key={g.key} colSpan={g.items.length * 3} className={CC}>{g.key === 'kondisi' ? 'Kondisi Kebersihan' : 'Persediaan'}</th>
                ))}
              </tr>
              <tr>{items.map(it => <th key={it.id} colSpan={3} className={CC} style={{ fontSize: '7px' }}>{CAPTION[it.id] || it.labelId}</th>)}</tr>
              <tr>{items.flatMap(it => it.marks.map(m => <th key={it.id + m} className={CC} style={H}>{MARK_LABEL[m]}</th>))}</tr>
            </thead>
            <tbody>
              {blockDates.map((date, bi) => {
                const slots = date ? byDate.get(date) || {} : {};
                const workers = [...new Set(Object.values(slots).map(s => s?.meta?.signoff?.draftedBy?.name || s?.userName).filter(Boolean))];
                const [y, m, d] = date ? date.split('-') : ['', '', ''];
                return (
                  <Fragment key={bi}>
                    <tr>
                      <td colSpan={totalCols} className={C + ' font-bold'} style={{ borderTopWidth: 2 }}>
                        Yang Mengerjakan : <span className="font-normal">{workers.join(', ')}</span>
                        <span className="ml-24">Paraf : <span className="font-normal">{workers.map(w => initials(w)).join(', ')}</span></span>
                      </td>
                    </tr>
                    {RESTROOM_SLOTS.map((slot, si) => {
                      const s = slots[slot];
                      const marks = new Map((s?.items || []).map(i => [i.id, String(i.answer ?? '')]));
                      return (
                        <tr key={slot} style={{ height: 15 }}>
                          {si === 0 && <td rowSpan={3} className={CC + ' font-bold'}>{date ? `${Number(d)}/${Number(m)}/${y.slice(2)}` : ''}</td>}
                          <td className={CC}>{slot}:00</td>
                          {items.flatMap(it => it.marks.map(mk => (
                            <td key={it.id + mk} className={CC}>{marks.get(it.id) === mk ? '✓' : ''}</td>
                          )))}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between pt-1">
            <div className="italic">Catat Masalah - Masalah yang di temui dalam<br />Form Penyimpangan.</div>
            <div className="text-center">
              <b>Tanda tangan Atasan</b>
              <div style={{ height: 22 }} className="flex items-end justify-center">{sign?.approvedBy?.name || sign?.verifiedBy?.name || ''}</div>
              ( ........................................ )
            </div>
          </div>
        </div>
      ))}
    </PrintPage>
  );
}
