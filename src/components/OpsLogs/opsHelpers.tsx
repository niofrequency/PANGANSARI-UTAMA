import React, { useState } from 'react';
import { MapPin, Hash, User as UserIcon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { Submission } from '../../types';
import { SignoffStep, SIGNOFF_CHAINS, SignoffChainType } from '../../data/opsLogsCatalog';

// Every ops-log fill form (the 7 forms in OpsLogsTab's FORM_COMPONENTS)
// and, since the Escalations/Ops Logs merge, TechnicianPortal's daily
// log, HousekeeperPortal's room cleaning, and GembaWalkForm all take this
// same shape. `editingSubmission` is set only when reopening a REJECTED
// entry to fix and resubmit — each form pre-fills its own state from it
// and calls store.resubmitAfterRejection() on save instead of
// addSubmission().
export interface OpsFormProps {
  store: ReturnType<typeof useAppStore>;
  onCancel?: () => void;
  onSubmitted: () => void;
  editingSubmission?: Submission;
}

// Small banner every fill form shows at the top when editingSubmission is
// set — a quick reminder of what resubmitting actually does, since it's
// not obvious from the form alone that this is a different mode than a
// normal fresh submission.
export function ResubmitNotice() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 p-4 bg-psu-blue/5 text-psu-blue text-xs rounded-2xl border border-psu-blue/10 font-medium">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>{t('ops.signoff.resubmitNote')}</span>
    </div>
  );
}

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
  const chain = SIGNOFF_CHAINS[submission.type as SignoffChainType];
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
  const chain = SIGNOFF_CHAINS[submission.type as SignoffChainType];
  if (!chain) return undefined;
  return chain.find(step => !submission.meta?.signoff?.[step]);
}

// Reject action shared by every review queue (OpsLogsTab now covers what
// used to be two separate screens — Field Queue and Escalations — see
// SIGNOFF_CHAINS's header comment). A reason is required: it's shown back
// to whoever filed this, as the whole explanation for why they have to
// fix and resubmit it.
export function RejectButton({ onReject }: { onReject: (reason: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const cancel = () => {
    setOpen(false);
    setReason('');
    setError('');
  };

  const confirm = () => {
    if (!reason.trim()) {
      setError(t('ops.signoff.rejectReasonRequired'));
      return;
    }
    onReject(reason.trim());
    cancel();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 py-4 bg-white border-2 border-psu-rejected text-psu-rejected rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <XCircle size={16} />
        {t('ops.signoff.rejectButton')}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); setError(''); }}
        placeholder={t('ops.signoff.rejectReasonPlaceholder')}
        className={cn(
          "w-full p-4 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-rejected/20 h-24",
          error ? "border-psu-rejected" : "border-psu-gray/10"
        )}
      />
      {error && <p className="text-[10px] text-psu-rejected font-bold">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={cancel} className="flex-1 py-3 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          {t('common.cancel')}
        </button>
        <button type="button" onClick={confirm} className="flex-[2] py-3 bg-psu-rejected text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
          {t('ops.signoff.rejectConfirm')}
        </button>
      </div>
    </div>
  );
}

// A checklist item's label plus its mark/answer button(s) — on one row
// when there's room for both, wrapping the buttons down to their own row
// below the label the moment there isn't, instead of both squeezing
// sideways into an unreadable sliver. That's what was happening before:
// every checklist-style row was hand-rolled as a plain non-wrapping
// `flex justify-between`, so a long compound label (e.g. "Dinding/Fan/
// Cermin/Penerangan" — Wall/Fan/Mirror/Lighting merged into one row) next
// to 2-3 buttons had nowhere to go on a phone but get crushed into a
// few-pixel-wide column. min-w-[140px] on the label column is what
// actually triggers the wrap: it refuses to shrink past a legible width,
// so once the label's minimum plus the buttons' natural width can't both
// fit, flex-wrap pushes the buttons onto their own line — no breakpoint
// to pick, it adapts continuously from the narrowest phone up.
//
// Every checklist-style item row (Ops Logs forms, Housekeeper's room
// checklist, Technician's daily wellness marks, Daily Food Handler
// criteria) should use this instead of hand-rolling the same flex row.
export function ChecklistRow({
  label, sublabel, extra, actions, missing, className,
}: {
  // Declared (never read) purely so `key={...}` type-checks when this is
  // rendered from a .map() — React strips it before the component ever
  // sees props, same as any other component; this line exists only to
  // satisfy the type checker in environments with a stricter/incomplete
  // React types setup.
  key?: React.Key;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  // Anything else that belongs in the label column, below sublabel (e.g.
  // Housekeeper's weekly/monthly due badge).
  extra?: React.ReactNode;
  actions: React.ReactNode;
  missing?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
      missing && "bg-psu-rejected/5 rounded-xl px-2 -mx-2 py-1",
      className
    )}>
      <div className="min-w-[140px] flex-1">
        <p className="text-sm font-bold text-psu-gray">{label}</p>
        {sublabel && <p className="text-[10px] text-psu-gray/40 italic">{sublabel}</p>}
        {extra}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0 ml-auto">
        {actions}
      </div>
    </div>
  );
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
