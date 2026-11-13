import { ReactNode } from 'react';
import { Submission } from '../../../types';

// Building blocks for the paper-replica print sheets — each Ops Log form
// prints in the same layout as the PSU paper pad it replaces (photos of
// the real sheets: logo box on the left, form title in the middle,
// document-control box on the right, then the paper's own grid and
// signature lines). Everything here is black-on-white with real borders
// so it photocopies/files exactly like the paper version.

export const B = 'border border-black';
// Compact grid cell used by every paper table.
export const C = 'border border-black px-1 py-0.5 align-middle';
export const CC = C + ' text-center';

export function PaperLogo({ height = 40 }: { height?: number }) {
  return <img src="/icons/psu-logo-full.png" alt="PSU Food Resources Solutions" style={{ height, width: 'auto' }} />;
}

// Logo | Title | Doc-control rows — the header every PSU form shares.
export function PaperHeader({
  title, subtitle, docRows, logoHeight = 40, titleSize = 15, titleShaded = false, docWidth = '30%',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  docRows: [string, string][];
  logoHeight?: number;
  titleSize?: number;
  titleShaded?: boolean;
  docWidth?: string;
}) {
  return (
    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
      <tbody>
        <tr>
          <td className={B + ' p-1 text-center align-middle'} style={{ width: '18%' }}>
            <PaperLogo height={logoHeight} />
          </td>
          <td
            className={B + ' p-1 text-center align-middle font-black'}
            style={{ fontSize: titleSize, background: titleShaded ? '#d9d9d9' : undefined }}
          >
            {title}
            {subtitle && <div className="italic font-bold" style={{ fontSize: titleSize * 0.65 }}>{subtitle}</div>}
          </td>
          <td className={B + ' p-0 align-top'} style={{ width: docWidth }}>
            <table className="w-full border-collapse">
              <tbody>
                {docRows.map(([k, v], i) => (
                  <tr key={k}>
                    <td className={(i > 0 ? 'border-t ' : '') + 'border-black border-r px-1'} style={{ width: '48%' }}>{k}</td>
                    <td className={(i > 0 ? 'border-t ' : '') + 'border-black px-1'}>: {v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ControlledCopy() {
  return (
    <span className="inline-block font-black px-3 py-0.5" style={{ background: '#d9d9d9', fontSize: '8px', letterSpacing: '0.05em' }}>
      CONTROLLED COPY
    </span>
  );
}

// "Mengetahui, ____ Pengawas/Process Owner" style signature block. `name`
// fills the line with whoever stamped that step in the app, if anyone has.
export function SigBlock({ heading, role, name, at, align = 'left' }: {
  heading?: string;
  role?: string;
  name?: string;
  at?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <div style={{ textAlign: align, minWidth: 140 }}>
      {heading && <div>{heading}</div>}
      <div style={{ height: 26, fontSize: '8px' }} className="flex items-end" >
        <span className="w-full" style={{ textAlign: align }}>
          {name || ''}{at ? ` · ${new Date(at).toLocaleDateString('en-GB')}` : ''}
        </span>
      </div>
      <div className="border-t border-black inline-block" style={{ minWidth: 140 }}>{role || ' '}</div>
    </div>
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <span className="inline-flex items-center justify-center border border-black" style={{ width: 10, height: 10, fontSize: '8px', lineHeight: 1 }}>
      {on ? '✓' : ''}
    </span>
  );
}

// Local calendar date (YYYY-MM-DD) of a submission — meta.date when the
// form records one, else the local date of its timestamp.
export function submissionDate(s: Submission): string {
  if (s.meta?.date) return s.meta.date;
  const d = new Date(s.timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthLabel(yyyyMm: string, lang: 'id' | 'en' = 'id'): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
}

export function longDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Short "paraf" — initials of whoever wrote a reading, e.g. "Budi Santoso" → "BS".
export function initials(name?: string): string {
  if (!name) return '';
  return name.split(/\s+/).filter(Boolean).map(p => p[0]!.toUpperCase()).slice(0, 3).join('');
}

// Every print sheet receives the submission being printed plus every other
// submission in the store, so month-long paper sheets (Temperature Control,
// Dishwashing, Mess Hall, Restroom) can fill in all the days, not just one.
export interface PrintSheetProps {
  submission: Submission;
  allSubmissions?: Submission[];
}

export function PrintPage({ landscape, children, fontSize = 8 }: { landscape?: boolean; children: ReactNode; fontSize?: number }) {
  return (
    <div className="psu-paper-sheet text-black bg-white" style={{ fontSize: `${fontSize}px`, lineHeight: 1.25, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <style>{`@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 8mm; }`}</style>
      {children}
    </div>
  );
}
