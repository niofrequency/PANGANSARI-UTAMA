import { Fragment } from 'react';
import { Submission } from '../../../types';
import {
  GEMBA_SECTIONS,
  GEMBA_DOC_HEADER,
  GEMBA_FORM_TITLE,
  GEMBA_FORM_SUBTITLE,
  GEMBA_META_LABELS,
  GEMBA_TABLE_HEADERS,
  GEMBA_EVALUATION_LEGEND,
  THREE_IN_A_ROW_TITLE,
  THREE_IN_A_ROW_ROLES,
  THREE_IN_A_ROW_PROMPTS,
} from '../../../data/gembaWalkData';

// Pixel-replica print output for a Gemba Walk submission — a plain black
// -on-white table laid out to match GEMBA_WALK__MASTER__EN__IDN.xlsx (see
// gembaWalkData.ts for exactly which cells each piece below comes from),
// not the app's own mobile card UI. Only ever rendered inside a `hidden
// print:block` wrapper (see GembaWalkReportView.tsx) — this component has
// no on-screen presence of its own.
const CELL = 'border border-black px-1.5 py-1 align-top';

export function GembaWalkPrintSheet({ submission }: { submission: Submission }) {
  const meta = submission.meta || {};
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));

  // Housekeeping-origin walks only ever cover Section A (see
  // InspectionsTab.tsx's `gembaSections` prop) — skip Section B entirely
  // rather than print it empty.
  const sections = GEMBA_SECTIONS.filter((sec) =>
    sec.categories.some((cat) => cat.items.some((it) => itemsById.has(it.id)))
  );

  const dateText = new Date(submission.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="text-black" style={{ fontSize: '9px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>

      {/* Title + doc-control box */}
      <table className="w-full border-collapse mb-2">
        <tbody>
          <tr>
            <td rowSpan={3} className={CELL + ' text-center font-black'} style={{ fontSize: '13px' }}>
              {GEMBA_FORM_TITLE}
              <div className="font-bold" style={{ fontSize: '9px' }}>{GEMBA_FORM_SUBTITLE}</div>
            </td>
            <td className={CELL} style={{ width: '22%' }}>{GEMBA_DOC_HEADER.code}</td>
          </tr>
          <tr>
            <td className={CELL}>{GEMBA_DOC_HEADER.revision}</td>
          </tr>
          <tr>
            <td className={CELL}>{GEMBA_DOC_HEADER.page}</td>
          </tr>
        </tbody>
      </table>

      {/* Meta strip */}
      <table className="w-full border-collapse mb-2">
        <tbody>
          <tr>
            <td className={CELL + ' font-bold'} style={{ width: '10%' }}>{GEMBA_META_LABELS.project}</td>
            <td className={CELL} style={{ width: '28%' }}>{meta.project || ''}</td>
            <td className={CELL + ' font-bold'} style={{ width: '14%' }}>{GEMBA_META_LABELS.compliance}</td>
            <td className={CELL} style={{ width: '10%' }}>{submission.score !== undefined ? `${submission.score}%` : ''}</td>
            <td className={CELL + ' font-bold'} style={{ width: '10%' }}>{GEMBA_META_LABELS.auditors}</td>
            <td className={CELL}>{meta.inspectorName || submission.userName}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>{GEMBA_META_LABELS.unit}</td>
            <td className={CELL}>{meta.unit || submission.siteName || ''}</td>
            <td className={CELL + ' font-bold'}>{GEMBA_META_LABELS.date}</td>
            <td className={CELL} colSpan={3}>{dateText}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>{GEMBA_META_LABELS.areaAudited}</td>
            <td className={CELL} colSpan={5}>{meta.areaAudited || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Main evaluation table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '3%' }}></th>
            <th className={CELL} style={{ width: '14%' }}></th>
            <th className={CELL} style={{ width: '31%' }}></th>
            <th className={CELL} style={{ width: '8%' }}>{GEMBA_TABLE_HEADERS.evaluation}</th>
            <th className={CELL} style={{ width: '14%' }}>{GEMBA_TABLE_HEADERS.observation}</th>
            <th className={CELL} style={{ width: '15%' }}>{GEMBA_TABLE_HEADERS.correctiveAction}</th>
            <th className={CELL} style={{ width: '15%' }}>{GEMBA_TABLE_HEADERS.comment}</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((sec) => (
            <Fragment key={sec.key}>
              <tr>
                <td colSpan={7} className={CELL + ' font-black'} style={{ background: '#ddd' }}>
                  {sec.key} - {sec.titleEn} / {sec.titleId}
                </td>
              </tr>
              {sec.categories.map((cat) => (
                <Fragment key={cat.key}>
                  {cat.items.map((item, idx) => {
                    const subm = itemsById.get(item.id);
                    return (
                      <tr key={item.id}>
                        {idx === 0 && (
                          <>
                            <td rowSpan={cat.items.length} className={CELL + ' text-center font-black'}>{cat.num}</td>
                            <td rowSpan={cat.items.length} className={CELL + ' font-bold'}>
                              {cat.titleEn}
                              <div className="italic font-normal">{cat.titleId}</div>
                            </td>
                          </>
                        )}
                        <td className={CELL}>
                          {item.descEn}
                          <div className="italic">{item.descId}</div>
                        </td>
                        <td className={CELL + ' text-center'}>{subm?.answer ? String(subm.answer) : ''}</td>
                        <td className={CELL}>{subm?.remarks || ''}</td>
                        <td className={CELL}>{subm?.correctiveAction || ''}</td>
                        <td className={CELL}>{subm?.comment || ''}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <p className="mt-2" style={{ fontSize: '8px' }}>
        {GEMBA_EVALUATION_LEGEND.en}
        <br />
        {GEMBA_EVALUATION_LEGEND.id}
      </p>

      {/* Section C — 3 in a Row (reference guide, not scored) */}
      <h3 className="font-black mt-4 mb-1" style={{ fontSize: '10px' }}>
        C - {THREE_IN_A_ROW_TITLE.en} / {THREE_IN_A_ROW_TITLE.id}
      </h3>
      <table className="w-full border-collapse mb-2">
        <tbody>
          {THREE_IN_A_ROW_ROLES.map((r) => (
            <tr key={r.level}>
              <td className={CELL} style={{ width: '35%' }}>{r.level}</td>
              <td className={CELL}>{r.position}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-bold mb-1" style={{ fontSize: '9px' }}>Points to look out for / Hal-hal yang perlu diperhatikan</p>
      <ul className="list-disc pl-4 mb-3" style={{ fontSize: '8px' }}>
        {THREE_IN_A_ROW_PROMPTS.map((p) => (
          <li key={p.en}>
            {p.en}
            <br />
            {p.id}
          </li>
        ))}
      </ul>

      {(meta.threeInARowNotes?.positives || meta.threeInARowNotes?.improvements) && (
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={CELL + ' font-bold'} style={{ width: '25%' }}>Positives observed</td>
              <td className={CELL}>{meta.threeInARowNotes?.positives || ''}</td>
            </tr>
            <tr>
              <td className={CELL + ' font-bold'}>Points for improvement</td>
              <td className={CELL}>{meta.threeInARowNotes?.improvements || ''}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
