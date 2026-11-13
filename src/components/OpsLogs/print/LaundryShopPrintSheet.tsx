import { LAUNDRY_GARMENT_COLUMNS } from '../../../data/laundryShopData';
import { B, C, CC, PaperHeader, PrintPage, PrintSheetProps, SigBlock, longDate, submissionDate } from './paperShared';

const ROWS_PER_SHEET = 22;
const SPARE_COLS = 4; // the paper has four blank garment columns after Kaos Kaki

// Daily Check List — Laundryshop: replica of the landscape paper pad (room
// number down the side, every garment type across, Keterangan, then the
// Dibuat / Diperiksa / Diketahui signature lines).
export function LaundryShopPrintSheet({ submission }: PrintSheetProps) {
  const rows = submission.meta?.laundryRows || [];
  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_SHEET));
  const date = submission.meta?.laundryDate || submissionDate(submission);
  const sign = submission.meta?.signoff;
  const vertical = { writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '7px' } as const;

  return (
    <PrintPage landscape fontSize={8}>
      {Array.from({ length: pages }, (_, p) => (
        <div key={p} className={B + ' p-2'} style={{ pageBreakAfter: p < pages - 1 ? 'always' : undefined }}>
          <PaperHeader
            title="DAILY CHECK LIST - LAUNDRYSHOP"
            titleShaded
            titleSize={13}
            logoHeight={34}
            docWidth="27%"
            docRows={[
              ['No. Dokumen', 'UN.00.'],
              ['Tgl. Review', '-'],
              ['No. / Tgl. Revisi', ''],
              ['Lokasi', 'Universal - Laundryshop'],
              ['Departemen', 'Housekeeping'],
            ]}
          />
          <div className="py-1">TANGGAL&nbsp;&nbsp;&nbsp;&nbsp;: <span className="inline-block border-b border-black" style={{ minWidth: 160 }}>{longDate(date)}</span></div>

          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th rowSpan={2} className={CC} style={{ width: '3%' }}>No.</th>
                <th rowSpan={2} className={CC} style={{ width: '5%' }}>Nomor<br />Kamar</th>
                <th colSpan={LAUNDRY_GARMENT_COLUMNS.length + SPARE_COLS} className={CC}>JENIS CUCIAN</th>
                <th rowSpan={2} className={CC} style={{ width: '14%' }}>Keterangan</th>
              </tr>
              <tr>
                {LAUNDRY_GARMENT_COLUMNS.map(g => (
                  <th key={g.id} className={CC} style={{ height: 84 }}><span style={vertical}>{g.labelId}</span></th>
                ))}
                {Array.from({ length: SPARE_COLS }, (_, i) => <th key={'s' + i} className={CC} />)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS_PER_SHEET }, (_, i) => {
                const r = rows[p * ROWS_PER_SHEET + i];
                return (
                  <tr key={i} style={{ height: 15 }}>
                    <td className={CC}>{r ? p * ROWS_PER_SHEET + i + 1 : ''}</td>
                    <td className={CC}>{r?.roomNumber || ''}</td>
                    {LAUNDRY_GARMENT_COLUMNS.map(g => <td key={g.id} className={CC}>{r?.counts[g.id] || ''}</td>)}
                    {Array.from({ length: SPARE_COLS }, (_, k) => <td key={'s' + k} className={CC} />)}
                    <td className={C} style={{ fontSize: '7px' }}>{r?.keterangan || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-around pt-2">
            <SigBlock heading="Dibuat Oleh," role="Laundryman/girl" name={sign?.draftedBy?.name || submission.userName} at={sign?.draftedBy?.at} />
            <SigBlock heading="Diperiksa Oleh," role="Leader / Supervisor laundry" name={sign?.checkedBy?.name} at={sign?.checkedBy?.at} />
            <SigBlock heading="Diketahui Oleh," role="Coord. / Asst.Manger / Manager" name={(sign?.approvedBy || sign?.verifiedBy)?.name} at={(sign?.approvedBy || sign?.verifiedBy)?.at} />
          </div>
        </div>
      ))}
    </PrintPage>
  );
}
