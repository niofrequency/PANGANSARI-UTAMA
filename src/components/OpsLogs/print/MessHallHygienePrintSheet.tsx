import { MESS_HALL_AREAS } from '../../../data/messHallHygieneData';
import { B, C, CC, PaperLogo, PrintPage, PrintSheetProps, SigBlock, daysInMonth, monthLabel, initials } from './paperShared';

const AREA_BG = '#f4f1a6';
const FOOT_BG = '#a9c7b4';

// UWL10001 Checklist Kebersihan dan Perawatan Area Mess Hall — replica of
// the landscape paper pad: area items down the side with their B/R legend,
// days 1–31 across ("Rencana Kerja"), then "Checked by Cleaning" and
// "Checked by supervisor" rows. One app submission = one area for one day,
// so this gathers every day of the month for the same area and site.
export function MessHallHygienePrintSheet({ submission, allSubmissions = [] }: PrintSheetProps) {
  const area = MESS_HALL_AREAS.find((a) => a.key === submission.meta?.areaKey) || MESS_HALL_AREAS[0];
  const month = (submission.meta?.date || submission.timestamp).slice(0, 7);
  const days = daysInMonth(month);

  const byDay = new Map<number, typeof submission>();
  for (const s of [...allSubmissions, submission]) {
    if (s.type !== 'MESS_HALL_HYGIENE' || (s.meta?.areaKey || MESS_HALL_AREAS[0].key) !== area.key || s.siteId !== submission.siteId) continue;
    const d = s.meta?.date;
    if (!d || !d.startsWith(month)) continue;
    byDay.set(Number(d.slice(8, 10)), s);
  }
  const dayNums = Array.from({ length: 31 }, (_, i) => i + 1);
  const approver = submission.meta?.signoff?.approvedBy;
  const verifier = submission.meta?.signoff?.verifiedBy;

  return (
    <PrintPage landscape fontSize={8}>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className={B + ' p-1 align-middle'} style={{ width: '20%' }}><PaperLogo height={36} /></td>
            <td className={B + ' text-center align-middle font-black'} style={{ background: '#d9d9d9', fontSize: 11 }}>
              CHECKLIST KEBERSIHAN DAN PERAWATAN&nbsp; AREA<br />MESS HALL
            </td>
            <td className={B + ' px-1 align-top'} style={{ width: '30%', fontSize: '8px' }}>
              <table className="w-full"><tbody>
                <tr><td style={{ width: '35%' }}>Document No.</td><td>:&nbsp;&nbsp; UWL10001</td></tr>
                <tr><td>Review date</td><td>:&nbsp;&nbsp; 19 Juni 2024</td></tr>
                <tr><td>Revision No.</td><td>:&nbsp;&nbsp; *03</td></tr>
                <tr><td>Date</td><td>:&nbsp;&nbsp; 19 Juni 2024</td></tr>
              </tbody></table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse mt-1" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="border-l border-t border-black px-1 align-top" style={{ width: '22%' }}>
              <b>Lokasi:</b> {submission.siteName}<br /><b>Bulan :</b> {monthLabel(month)}
            </td>
            <td className="border-t border-black px-1 align-top" style={{ width: '20%' }}>
              <b>Ket:</b>&nbsp;&nbsp; <b>B</b> : Bersih/Baik<br />
              <span className="pl-6"><b>R</b> : Rusak</span>
            </td>
            <td className="border-t border-r border-black px-1 align-top" style={{ fontSize: '7.5px' }}>
              <b>Cara Pengisian :</b> <i>Isi kolom dengan tanda centang dan paraf bila pembersihan sudah dilakukan</i><br />
              <b>Cara Membersihkan :</b> <i>Matikan semua peralatan, kenakan APD yang tepat,basahi dengan air, gosok dengan deterjen, bilas dan keringkan</i>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '2.5%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '3%' }} />
          {dayNums.map(d => <col key={d} />)}
        </colgroup>
        <thead>
          <tr>
            <th colSpan={3} rowSpan={2} className={CC}>KEBERSIHAN &amp; PERAWATANSARANA<br /><u>DAN PRASARANA</u></th>
            <th colSpan={31} className={CC}>RENCANA KERJA</th>
          </tr>
          <tr>{dayNums.map(d => <th key={d} className={CC} style={{ fontSize: '7px' }}>{d}</th>)}</tr>
        </thead>
        <tbody>
          <tr style={{ background: AREA_BG }}>
            <td className={CC + ' font-bold'}>{area.key}</td>
            <td colSpan={2} className={C + ' font-bold'} style={{ fontSize: '7.5px' }}>{area.titleId.toUpperCase()}</td>
            {dayNums.map(d => <td key={d} className={C} />)}
          </tr>
          {area.items.map((it, idx) => (
            <tr key={it.id} style={{ height: 15 }}>
              <td className={CC}>{idx + 1}</td>
              <td className={C}>{it.labelId}</td>
              <td className={CC} style={{ fontSize: '7px' }}>B&nbsp;R</td>
              {dayNums.map(d => {
                const mark = d <= days ? byDay.get(d)?.items.find(i => i.id === it.id)?.answer : undefined;
                return (
                  <td key={d} className={CC + ' font-bold'} style={{ color: mark === 'R' ? '#c00' : undefined }}>
                    {mark === 'B' || mark === 'R' ? mark : ''}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr style={{ background: FOOT_BG }}>
            <td colSpan={3} className={C + ' text-right italic font-bold'}>Checked by Cleaning</td>
            {dayNums.map(d => {
              const s = byDay.get(d);
              return <td key={d} className={CC} style={{ fontSize: '6px' }}>{initials(s?.meta?.signoff?.draftedBy?.name || s?.userName)}</td>;
            })}
          </tr>
          <tr style={{ background: FOOT_BG }}>
            <td colSpan={3} className={C + ' text-right italic font-bold'}>Checked by supervisor</td>
            {dayNums.map(d => {
              const s = byDay.get(d);
              return <td key={d} className={CC} style={{ fontSize: '6px' }}>{initials(s?.meta?.signoff?.checkedBy?.name)}</td>;
            })}
          </tr>
        </tbody>
      </table>

      <div className={'flex justify-between px-16 pt-3 pb-2 border-l border-r border-b border-black'}>
        <SigBlock heading="Approved By," role="Manager" name={approver?.name} at={approver?.at} align="center" />
        <SigBlock heading="Verified by :" role="QSHE/Head Chef" name={verifier?.name} at={verifier?.at} align="center" />
      </div>
    </PrintPage>
  );
}
