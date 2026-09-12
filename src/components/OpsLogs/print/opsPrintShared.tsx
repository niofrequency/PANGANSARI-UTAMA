import { Submission } from '../../../types';
import { SIGNOFF_CHAINS, SignoffChainType, SignoffStep } from '../../../data/opsLogsCatalog';

// Shared building blocks for every Ops Log print sheet (see
// OpsLogsTab.tsx's Print button). Unlike the 3 audit forms (Gemba Walk,
// Daily Food Handler, Food Safety Inspection), these 7 forms plus Room
// Cleaning and the Technician's daily log were transcribed from
// photographed paper pads, not an .xlsx with recoverable cell-exact
// styling (see each data file's own header comment) — so "pixel-accurate
// replica" here means faithfully reproducing the paper's rows, columns,
// and mark legend, not a cell-for-cell clone of an original spreadsheet
// the app never had. Where a form's raw per-column readings are still
// available on the submission (Laundry Shop's meta.laundryRows, Room
// Cleaning and Restroom's flat per-item marks), the print sheet uses them
// for a real column-exact table; where only the already-formatted
// question/answer/remarks survive on `items` (Cooking Service, Hot Packed
// Meal, Thawing, Staff Ready, Mess Hall Hygiene), the print sheet groups
// those rows using the same source-workbook structure the fill form
// itself used, but shows the single formatted reading the form kept
// rather than re-deriving separate cook/install/pack columns from it.
export const CELL = 'border border-black px-1.5 py-1 align-top';

export function OpsPrintHeader({
  title, formId, submission, extra,
}: {
  title: string;
  formId: string;
  submission: Submission;
  // An extra label:value row specific to this form (e.g. Mess Hall's
  // area, Restroom's slot/section, Thawing's method) — plain text, shown
  // under the standard site/date/submitter row.
  extra?: { label: string; value: string }[];
}) {
  const dateText = new Date(submission.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const draftedBy = submission.meta?.signoff?.draftedBy;
  const submitterName = draftedBy?.name || submission.userName;
  const staffCode = draftedBy?.staffCode;

  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between">
        <h1 className="font-black" style={{ fontSize: '13px' }}>{title}</h1>
        <span style={{ fontSize: '8px' }}>{formId}</span>
      </div>
      <table className="w-full border-collapse mt-1">
        <tbody>
          <tr>
            <td className={CELL + ' font-bold'} style={{ width: '12%' }}>Site</td>
            <td className={CELL}>{submission.siteName}</td>
            <td className={CELL + ' font-bold'} style={{ width: '12%' }}>Date</td>
            <td className={CELL}>{dateText}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>Submitted by</td>
            <td className={CELL}>{submitterName}{staffCode ? ` (${staffCode})` : ''}</td>
            {extra?.[0] ? (
              <>
                <td className={CELL + ' font-bold'}>{extra[0].label}</td>
                <td className={CELL}>{extra[0].value}</td>
              </>
            ) : (
              <>
                <td className={CELL}></td>
                <td className={CELL}></td>
              </>
            )}
          </tr>
          {extra && extra.length > 1 && (
            <tr>
              {extra.slice(1, 3).flatMap((e) => [
                <td key={e.label + '-l'} className={CELL + ' font-bold'}>{e.label}</td>,
                <td key={e.label + '-v'} className={CELL}>{e.value}</td>,
              ])}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const STEP_LABEL: Record<SignoffStep, string> = {
  checkedBy: 'Checked',
  approvedBy: 'Approved',
  verifiedBy: 'Verified',
};

// Sign-off block — draftedBy (always) plus whichever of checked/approved/
// verified this submission type's chain actually uses (opsLogsCatalog.ts's
// SIGNOFF_CHAINS), each shown filled in with the stamping name + timestamp
// once stamped, or left as a blank signature line if this copy is printed
// before every step is in.
export function OpsPrintSignoff({ submission }: { submission: Submission }) {
  const chain = SIGNOFF_CHAINS[submission.type as SignoffChainType] || [];
  const signoff = submission.meta?.signoff;
  const draftedBy = signoff?.draftedBy;

  const slots: { label: string; name?: string; at?: string }[] = [
    { label: 'Drafted', name: draftedBy?.name || submission.userName, at: draftedBy?.at || submission.timestamp },
    ...chain.map((step) => ({ label: STEP_LABEL[step], name: signoff?.[step]?.name, at: signoff?.[step]?.at })),
  ];

  return (
    <table className="w-full border-collapse mt-4" style={{ tableLayout: 'fixed' }}>
      <tbody>
        <tr>
          {slots.map((s) => (
            <td key={s.label} className="align-top px-2" style={{ width: `${100 / slots.length}%` }}>
              <p style={{ fontSize: '8px' }} className="font-bold">{s.label}</p>
              <div className="border-b border-black" style={{ height: '28px' }} />
              <p style={{ fontSize: '7px' }}>
                {s.name || ''}
                {s.at ? <><br />{new Date(s.at).toLocaleString('en-GB')}</> : ''}
              </p>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

// The fallback shape most of these forms print as: a plain 3-column table
// straight off `submission.items` — No / Item (question) / Reading
// (answer) / Notes (remarks) — for whichever rows `ids` selects, in that
// order. Used directly by the simpler types, and as the row-renderer
// inside the grouped tables the richer types build around it.
export function OpsItemsTable({ submission, ids }: { submission: Submission; ids?: string[] }) {
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));
  const rows = ids ? ids.map((id) => itemsById.get(id)).filter((i): i is Submission['items'][number] => !!i) : submission.items;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={CELL} style={{ width: '4%' }}>No</th>
          <th className={CELL} style={{ width: '42%' }}>Item</th>
          <th className={CELL} style={{ width: '18%' }}>Reading</th>
          <th className={CELL} style={{ width: '36%' }}>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, idx) => (
          <tr key={item.id}>
            <td className={CELL + ' text-center'}>{idx + 1}</td>
            <td className={CELL}>{item.question}</td>
            <td className={CELL}>{item.answer === true ? 'OK' : item.answer === false ? 'X' : String(item.answer)}</td>
            <td className={CELL}>{item.remarks || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
