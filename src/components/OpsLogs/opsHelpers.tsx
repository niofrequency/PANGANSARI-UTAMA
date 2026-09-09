import React from 'react';
import { MapPin, Hash, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { SignoffStep, SIGNOFF_CHAINS } from '../../data/opsLogsCatalog';
import { OpsLogType } from '../../types';

// Read-only header shown on every ops-log fill screen — site, department,
// form id, user name, staff code — so nobody has to handwrite lokasi / ID
// (PRD section 6). Every new form uses this instead of its own ad hoc
// header row.
//
// The site chip becomes a small picker instead of plain text once this
// filler has Site Access to more than one site (siteOptions.length > 1
// — see hooks/useWorkingSite.ts) — most accounts still have exactly one
// site and see plain text, unchanged from before Site Access existed.
export function OpsHeaderChip({
  siteName, formId, userName, staffCode, departmentLabel, siteOptions, onSiteChange,
}: {
  siteName: string;
  formId: string;
  userName: string;
  staffCode?: string;
  departmentLabel: string;
  siteOptions?: { id: string; name: string }[];
  onSiteChange?: (siteId: string) => void;
}) {
  const showSitePicker = siteOptions && siteOptions.length > 1 && onSiteChange;
  return (
    <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 !py-4">
      <span className="flex items-center gap-1.5 text-[10px] font-black text-psu-gray/50 uppercase tracking-widest">
        <MapPin size={12} className="shrink-0" />
        {showSitePicker ? (
          <select
            value={siteOptions!.find(s => s.name === siteName)?.id ?? ''}
            onChange={(e) => onSiteChange!(e.target.value)}
            className="bg-psu-bg border border-psu-gray/10 rounded-md px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-psu-blue/20 normal-case font-bold"
          >
            {siteOptions!.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : siteName}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-black text-psu-gray/50 uppercase tracking-widest">
        <Hash size={12} /> {formId}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-black text-psu-gray/50 uppercase tracking-widest">
        <UserIcon size={12} /> {userName}{staffCode ? ` (${staffCode})` : ''}
      </span>
      <span className="ml-auto text-[9px] font-black text-psu-blue/70 bg-psu-blue/5 px-2 py-1 rounded-full uppercase tracking-widest">
        {departmentLabel}
      </span>
    </div>
  );
}

const STEP_LABEL_KEY: Record<SignoffStep, string> = {
  checkedBy: 'ops.signoff.checkedBy',
  approvedBy: 'ops.signoff.approvedBy',
  verifiedBy: 'ops.signoff.verifiedBy',
};

// Small progress readout for a submission's sign-off chain — used on
// queue cards and detail views across every ops-log type. Shows each
// required step in order, filled in green once stamped.
export function SignoffProgress({ submission }: { submission: Submission }) {
  const { t } = useTranslation();
  const chain = SIGNOFF_CHAINS[submission.type as OpsLogType];
  if (!chain) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chain.map(step => {
        const stamp = submission.meta?.signoff?.[step];
        return (
          <span
            key={step}
            className={cn(
              "flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md",
              stamp ? "bg-psu-green/10 text-psu-green" : "bg-psu-gray/5 text-psu-gray/30"
            )}
            title={stamp ? `${stamp.name} · ${new Date(stamp.at).toLocaleString()}` : undefined}
          >
            {stamp && <CheckCircle2 size={10} />}
            {t(STEP_LABEL_KEY[step])}
          </span>
        );
      })}
    </div>
  );
}

// The next unfilled step in a submission's chain — undefined once every
// required stamp is in, since the submission is APPROVED by then.
export function nextSignoffStep(submission: Submission): SignoffStep | undefined {
  const chain = SIGNOFF_CHAINS[submission.type as OpsLogType];
  if (!chain) return undefined;
  return chain.find(step => !submission.meta?.signoff?.[step]);
}

// Small reusable "flag" pill for an out-of-range reading — the paper still
// records the number either way, this just calls attention to it.
export function OutOfRangeFlag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected bg-psu-rejected/10 px-2 py-1 rounded-full">
      {label}
    </span>
  );
}
