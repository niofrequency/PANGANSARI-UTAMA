import { Fragment } from 'react';
import { Submission } from '../../../types';
import {
  INSPECTION_SECTIONS,
  FSI_FORM_TITLE,
  FSI_META_LABELS,
  FSI_TABLE_HEADERS,
  FSI_INSTRUCTION_NOTE,
} from '../../../data/inspectionChecklistData';
import { ConformityCode } from '../../../data/inspectionScoring';

// Pixel-replica print output for a Food Safety Inspection Checklist
// submission — a plain black-on-white table matching
// GUIDELINES_FOOD_SAFETY_INSPECTION.xls's "Audit Check List" sheet (see
// inspectionChecklistData.ts for exactly which cells each piece comes
// from), not this screen's own card UI. Naturally spans several printed
// pages — the source itself is 205 rows across 17 sections — unlike Gemba
// Walk/Daily Food Handler, which fit on one. One simplification from the
// source: the CONFORMITY (A/B/C/N/A) sub-header is printed once at the top
// of the table rather than repeated under every section banner as the
// workbook does — meant for a reader working straight through the pages
// rather than flipping to a single page.
const CELL = 'border border-black px-1.5 py-1 align-top';

export function InspectionPrintSheet({ submission }: { submission: Submission }) {
  const meta = submission.meta || {};
  const itemsById = new Map(submission.items.map((i) => [i.id, i]));
  const dateText = new Date(submission.timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeText = new Date(submission.timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const CODES: ConformityCode[] = ['A', 'B', 'C', 'NA'];

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>

      <h1 className="text-center font-black mb-2" style={{ fontSize: '13px' }}>{FSI_FORM_TITLE}</h1>

      {/* Meta strip */}
      <table className="w-full border-collapse mb-2">
        <tbody>
          <tr>
            <td className={CELL + ' font-bold'} style={{ width: '20%' }}>{FSI_META_LABELS.locationArea}</td>
            <td className={CELL} style={{ width: '30%' }}>{meta.areaAudited || ''}</td>
            <td className={CELL + ' font-bold'} style={{ width: '20%' }}>{FSI_META_LABELS.inspector}</td>
            <td className={CELL}>{meta.inspectorName || submission.userName}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>{FSI_META_LABELS.date}</td>
            <td className={CELL}>{dateText}</td>
            <td className={CELL + ' font-bold'} style={{ whiteSpace: 'pre-line' }}>{FSI_META_LABELS.areaOwner}</td>
            <td className={CELL}>{meta.areaOwner || ''}</td>
          </tr>
          <tr>
            <td className={CELL + ' font-bold'}>{FSI_META_LABELS.time}</td>
            <td className={CELL}>{timeText}</td>
            <td className={CELL + ' font-bold'}>Overall Score</td>
            <td className={CELL + ' font-bold'}>
              {submission.score !== undefined ? `${submission.score}%` : ''}
              {meta.category ? ` — Category ${meta.category}` : ''}
              {meta.categoryStatus ? ` (${meta.categoryStatus})` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-2" style={{ fontSize: '7px' }}>
        {FSI_INSTRUCTION_NOTE.id}
        <br />
        {FSI_INSTRUCTION_NOTE.en}
      </p>

      {/* Main checklist table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={CELL} style={{ width: '4%' }}>{FSI_TABLE_HEADERS.no}</th>
            <th className={CELL} style={{ width: '38%' }}>{FSI_TABLE_HEADERS.explanation}</th>
            <th className={CELL} style={{ width: '14%' }}>{FSI_TABLE_HEADERS.reference}</th>
            <th className={CELL} colSpan={4} style={{ width: '12%' }}>{FSI_TABLE_HEADERS.conformity}</th>
            <th className={CELL} style={{ width: '18%' }}>{FSI_TABLE_HEADERS.remarks}</th>
          </tr>
          <tr>
            <th className={CELL}></th>
            <th className={CELL}></th>
            <th className={CELL}></th>
            {CODES.map((c) => (
              <th key={c} className={CELL} style={{ width: '3%' }}>{c === 'NA' ? 'N/A' : c}</th>
            ))}
            <th className={CELL}></th>
          </tr>
        </thead>
        <tbody>
          {INSPECTION_SECTIONS.map((sec) => (
            <Fragment key={sec.key}>
              <tr>
                <td colSpan={8} className={CELL + ' font-black'} style={{ background: '#ddd' }}>
                  {sec.no ? `${sec.no}. ` : ''}{sec.titleId} / {sec.titleEn}
                </td>
              </tr>
              {sec.items.map((item) => {
                const subm = itemsById.get(item.id);
                return (
                  <tr key={item.id}>
                    <td className={CELL}>{item.no || ''}</td>
                    <td className={CELL}>
                      {(item.labelId || item.labelEn) && (
                        <div className="font-bold">
                          {item.labelId}
                          {item.labelEn && <div className="italic font-normal">{item.labelEn}</div>}
                        </div>
                      )}
                      {item.descId}
                      <div className="italic">{item.descEn}</div>
                    </td>
                    <td className={CELL} style={{ whiteSpace: 'pre-line' }}>{item.reference || ''}</td>
                    {CODES.map((c) => (
                      <td key={c} className={CELL + ' text-center'}>{subm?.answer === c ? 'X' : ''}</td>
                    ))}
                    <td className={CELL}>{subm?.remarks || ''}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
