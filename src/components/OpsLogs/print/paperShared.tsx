import { ReactNode } from 'react';
import { Submission, UserRole } from '../../../types';

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
export function SigBlock({ heading, role, name, at, align = 'left', stamp, step, stamps }: {
  // Several steps sharing one signature line (e.g. Temp Control's single
  // "Mengetahui" line holds both the Supervisor's and Manager's stamps).
  stamps?: [SignStep, StampData | undefined][];
  // When a reviewer has stamped this step, show their rubber stamp on
  // the signature line instead of the plain name text.
  stamp?: StampData;
  step?: SignStep;
  heading?: string;
  role?: string;
  name?: string;
  at?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <div style={{ textAlign: align, minWidth: 140 }}>
      {heading && <div>{heading}</div>}
      <div style={{ minHeight: 26, fontSize: '8px' }} className="flex items-end" >
        <span className="w-full" style={{ textAlign: align }}>
          {stamps && stamps.some(([, x]) => x?.name)
            ? <span className="inline-flex gap-1.5 pb-0.5 flex-wrap" style={{ justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
                {stamps.map(([st, x]) => x?.name ? <span key={st}><StampMark step={st} stamp={x} /></span> : null)}
              </span>
            : stamp?.name && step
            ? <span className="inline-block pb-0.5"><StampMark step={step} stamp={stamp} /></span>
            : <>{name || ''}{at ? ` · ${new Date(at).toLocaleDateString('en-GB')}` : ''}</>}
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

// ---------------------------------------------------------------------
// Review stamp — the "rubber stamp" a reviewer leaves on the paper once
// they Stamp a log in the app: the step (CHECKED / APPROVED / VERIFIED),
// the reviewer's job title, their name and the date. Every sheet's
// signature lines render one of these as soon as that step is in, for
// every level of the chain (Supervisor, Manager, GM, Admin).
export type SignStep = 'checkedBy' | 'approvedBy' | 'verifiedBy';
export type StampData = { userId?: string; name: string; at: string; role?: UserRole; signature?: string };

const STEP_WORD: Record<SignStep, string> = { checkedBy: 'CHECKED', approvedBy: 'APPROVED', verifiedBy: 'VERIFIED' };

export const ROLE_TITLE: Record<UserRole, string> = {
  ADMIN: 'Admin',
  GENERAL_MANAGER: 'General Manager',
  HOUSEKEEPING_MANAGER: 'Housekeeping Manager',
  FOOD_SAFETY_MANAGER: 'Food Safety Manager',
  HOUSEKEEPING_SUPERVISOR: 'Housekeeping Supervisor',
  FOOD_SAFETY_SUPERVISOR: 'Food Safety Supervisor',
  HOUSEKEEPING_LEADHAND: 'Housekeeping Leadhand',
  FOOD_SAFETY_LEADHAND: 'Food Safety Leadhand',
  HOUSEKEEPER: 'Housekeeper',
  HOUSEKEEPING_LAUNDRY: 'Laundry',
  HOUSEKEEPING_JANITOR: 'Janitor',
  FOOD_SAFETY_TECHNICIAN: 'Food Safety Technician',
};

export function StampMark({ step, stamp, small = false }: { step: SignStep; stamp?: StampData; small?: boolean }) {
  if (!stamp?.name) return null;
  const color = step === 'checkedBy' ? '#1d4ed8' : step === 'approvedBy' ? '#047857' : '#7c3aed';
  const date = stamp.at ? new Date(stamp.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const title = stamp.role ? ROLE_TITLE[stamp.role] : '';
  return (
    <span
      className="inline-block text-center align-middle"
      style={{
        border: `${small ? 1.5 : 2}px solid ${color}`,
        outline: `1px solid ${color}`,
        outlineOffset: small ? 1 : 2,
        color,
        borderRadius: 4,
        padding: small ? '1px 4px' : '2px 8px',
        transform: 'rotate(-4deg)',
        lineHeight: 1.15,
        fontSize: small ? '6.5px' : '8px',
        background: 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      <span className="block font-black tracking-widest" style={{ fontSize: small ? '7.5px' : '10px' }}>
        ✓ {STEP_WORD[step]}{title ? ` BY ${title.toUpperCase()}` : ''}
      </span>
      {stamp.signature && (
        <img src={stamp.signature} alt="" className="block mx-auto" style={{ height: small ? 16 : 24, maxWidth: small ? 90 : 130, objectFit: 'contain', margin: '1px auto' }} />
      )}
      <span className="block font-bold">{stamp.name}</span>
      {date && <span className="block">{date}</span>}
    </span>
  );
}

// Fills in the job title on stamps saved before the role was recorded
// on the stamp itself, from the current user list.
export function withStampRoles(s: Submission, users: { id: string; role: UserRole }[]): Submission {
  const so = s.meta?.signoff;
  if (!so) return s;
  const next: Record<string, unknown> = { ...so };
  let changed = false;
  for (const step of ['checkedBy', 'approvedBy', 'verifiedBy'] as SignStep[]) {
    const st = so[step] as StampData | undefined;
    if (st && !st.role && st.userId) {
      const u = users.find((x) => x.id === st.userId);
      if (u) { next[step] = { ...st, role: u.role }; changed = true; }
    }
  }
  return changed ? { ...s, meta: { ...s.meta, signoff: next as NonNullable<Submission['meta']>['signoff'] } } : s;
}
