import { ComponentType, ReactNode, useEffect, useRef, useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, CornerUpLeft, Pencil, Printer, Send, Stamp, Trash2, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { withStampRoles } from './print/paperShared';
import { PaperViewer } from './PaperViewer';
import { SignatureStampDialog } from './SignatureStampDialog';
import { Submission } from '../../types';
import { titleKeyForChainType, SignoffStep } from '../../data/opsLogsCatalog';
import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from '../../data/dailyFoodHandlerData';
import { canManageSubmission } from '../../lib/submissionAuthority';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';
import { cn } from '../../utils/cn';
import { Lightbox } from '../Lightbox';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SignoffProgress, nextSignoffStep } from './opsHelpers';
import { MessHallHygienePrintSheet } from './print/MessHallHygienePrintSheet';
import { CookingServicePrintSheet } from './print/CookingServicePrintSheet';
import { HotPackedMealPrintSheet } from './print/HotPackedMealPrintSheet';
import { ThawingPrintSheet } from './print/ThawingPrintSheet';
import { StaffReadyPrintSheet } from './print/StaffReadyPrintSheet';
import { LaundryShopPrintSheet } from './print/LaundryShopPrintSheet';
import { RestroomPrintSheet } from './print/RestroomPrintSheet';
import { RoomCleaningPrintSheet } from './print/RoomCleaningPrintSheet';
import { FoodSafetyDailyLogPrintSheet } from './print/FoodSafetyDailyLogPrintSheet';
import { TempControlPrintSheet } from './print/TempControlPrintSheet';
import { DishwashPrintSheet } from './print/DishwashPrintSheet';
import { PrintSheetProps } from './print/paperShared';
import { GembaWalkPrintSheet } from '../Inspections/print/GembaWalkPrintSheet';
import { InspectionPrintSheet } from '../Inspections/print/InspectionPrintSheet';
import { DailyFoodHandlerPrintSheet } from '../Inspections/print/DailyFoodHandlerPrintSheet';

type Store = ReturnType<typeof useAppStore>;

// Paper-replica sheet per log type: the same PSU paper form the worker's
// checklist replaces. Shown on screen on the review page (so every level
// of the chain reviews the form in its paper layout, with the stamps on
// its signature lines) and used for Print.
export const OPS_PRINT_COMPONENTS: Partial<Record<Submission['type'], ComponentType<PrintSheetProps>>> = {
  TEMP_CONTROL: TempControlPrintSheet,
  DISHWASH_TEMP: DishwashPrintSheet,
  MESS_HALL_HYGIENE: MessHallHygienePrintSheet,
  COOKING_SERVICE: CookingServicePrintSheet,
  HOT_PACKED_MEAL: HotPackedMealPrintSheet,
  THAWING: ThawingPrintSheet,
  STAFF_READY: StaffReadyPrintSheet,
  LAUNDRY_SHOP: LaundryShopPrintSheet,
  RESTROOM: RestroomPrintSheet,
  HOUSEKEEPING: RoomCleaningPrintSheet,
  FOOD_SAFETY: FoodSafetyDailyLogPrintSheet,
  GEMBA_WALK: GembaWalkPrintSheet,
  FOOD_SAFETY_INSPECTION: InspectionPrintSheet,
  DAILY_FOOD_HANDLER: DailyFoodHandlerPrintSheet,
};

// Sheets laid out on landscape A4; the rest are portrait.
const LANDSCAPE_SHEETS = new Set<Submission['type']>([
  'MESS_HALL_HYGIENE', 'COOKING_SERVICE', 'HOT_PACKED_MEAL', 'THAWING', 'STAFF_READY', 'LAUNDRY_SHOP', 'RESTROOM', 'DAILY_FOOD_HANDLER',
]);

// A Food Safety Technician's daily log includes a wellness / hygiene / PPE
// self-check; any "Not Good" there means they may not be fit to handle food.
export const isNotReadyToWork = (s: Submission) =>
  s.type === 'FOOD_SAFETY' &&
  DAILY_FOOD_HANDLER_ALL_CRITERIA.some(c => s.items.find(i => i.id === c.id)?.answer === false);

// Makes an open detail page part of the browser history: the phone's /
// browser's Back button closes it (back to the list), and closing it from
// the page's own Back button removes that history entry again.
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const marker = `psu-detail-${Date.now()}`;
    window.history.pushState({ psuDetail: marker }, '');
    window.scrollTo({ top: 0 });
    // Ignore a Back that only closed something layered on top (e.g. the
    // paper viewer's full screen) and landed back on this page's entry.
    const onPop = () => { if (window.history.state?.psuDetail !== marker) closeRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.psuDetail === marker) window.history.back();
    };
  }, [open]);
}

// Button that opens an inline note box, then confirms with that note.
function NoteAction({ label, icon, placeholder, confirmLabel, tone, onConfirm }: {
  label: string; icon: ReactNode; placeholder: string; confirmLabel: string; tone: 'warn' | 'blue'; onConfirm: (note: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className={cn('w-full py-4 bg-white border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2',
          tone === 'warn' ? 'border-psu-warning text-psu-warning' : 'border-psu-blue text-psu-blue')}>
        {icon} {label}
      </button>
    );
  }
  return (
    <div className="w-full space-y-3">
      <textarea value={note} onChange={(e) => { setNote(e.target.value); setError(false); }} placeholder={placeholder} autoFocus
        className={cn('w-full p-4 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none h-24', error ? 'border-psu-rejected' : 'border-psu-gray/10')} />
      {error && <p className="text-[10px] text-psu-rejected font-bold">{t('ops.signoff.rejectReasonRequired')}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => { setOpen(false); setNote(''); setError(false); }} className="flex-1 py-3 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button type="button" onClick={() => { if (!note.trim()) { setError(true); return; } onConfirm(note.trim()); setOpen(false); setNote(''); }}
          className={cn('flex-[2] py-3 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest', tone === 'warn' ? 'bg-psu-warning' : 'bg-psu-blue')}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// Reject / Return with a note AND a choice of who fixes it: the person
// who filled it in, or a reviewer lower in the chain who had stamped it
// (e.g. a Manager sends it back to the Supervisor who checked it).
type SendBackTarget = 'filer' | SignoffStep;
function SendBackAction({ s, me, label, tone, onConfirm }: {
  s: Submission; me?: string; label: string; tone: 'reject' | 'warn';
  onConfirm: (note: string, target: SendBackTarget) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);
  const so = s.meta?.signoff || {};
  const options: { target: SendBackTarget; name: string; role: string }[] = [
    { target: 'filer', name: s.meta?.signoff?.draftedBy?.name || s.userName, role: s.role },
  ];
  for (const step of ['checkedBy', 'approvedBy', 'verifiedBy'] as SignoffStep[]) {
    const st = so[step];
    if (st && st.userId !== me && st.userId !== s.userId && !options.some(o => o.target !== 'filer' && o.name === st.name)) {
      options.push({ target: step, name: st.name, role: st.role || '' });
    }
  }
  // Default: the reviewer just below (the last stamp before mine), else the filer.
  const [target, setTarget] = useState<SendBackTarget>(options.length > 1 ? options[options.length - 1].target : 'filer');
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className={cn('w-full py-4 bg-white border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2',
          tone === 'reject' ? 'border-psu-rejected text-psu-rejected' : 'border-psu-warning text-psu-warning')}>
        {tone === 'reject' ? <XCircle size={16} /> : <CornerUpLeft size={16} />} {label}
      </button>
    );
  }
  return (
    <div className={cn('w-full space-y-3 rounded-2xl border-2 p-4', tone === 'reject' ? 'border-psu-rejected/30' : 'border-psu-warning/30')}>
      <textarea value={note} onChange={(e) => { setNote(e.target.value); setError(false); }} placeholder={t('ops.chain.returnPlaceholder')} autoFocus
        className={cn('w-full p-4 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none h-24', error ? 'border-psu-rejected' : 'border-psu-gray/10')} />
      {error && <p className="text-[10px] text-psu-rejected font-bold">{t('ops.signoff.rejectReasonRequired')}</p>}
      {options.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-psu-gray/50">{t('ops.chain.whoFixes')}</p>
          {options.map(o => (
            <label key={o.target} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer',
              target !== o.target ? 'border-psu-gray/10' : tone === 'reject' ? 'border-psu-rejected bg-psu-rejected/5' : 'border-psu-warning bg-psu-warning/5')}>
              <input type="radio" name={`sendback-${s.id}`} checked={target === o.target} onChange={() => setTarget(o.target)} />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-psu-gray">{o.name}</span>
                <span className="block text-[10px] font-bold text-psu-gray/50">
                  {o.role ? t(`rolesShort.${o.role}`) : ''}{o.target === 'filer' ? ` · ${t('ops.chain.filledItIn')}` : ` · ${t(`ops.signoff.${o.target}`)}`}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={() => { setOpen(false); setNote(''); setError(false); }} className="flex-1 py-3 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button type="button" onClick={() => { if (!note.trim()) { setError(true); return; } onConfirm(note.trim(), target); setOpen(false); setNote(''); }}
          className={cn('flex-[2] py-3 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest', tone === 'reject' ? 'bg-psu-rejected' : 'bg-psu-warning')}>
          {t('ops.chain.sendBackTo', { name: options.find(o => o.target === target)?.name || '' })}
        </button>
      </div>
    </div>
  );
}

// Full-page view of one log (not a popup): Back returns to the list it
// came from. Used by Ops Logs (Supervisor / Manager / GM) and Admin →
// Activity. Actions depend on who's looking:
// - the next reviewer in the chain: Stamp or Reject
// - a Supervisor or higher, above whoever filed it: Return for correction
//   (any status — clears every stamp, so it climbs the chain again) and Delete
// - whoever filed it, once it's been sent back: Edit & resubmit (where the
//   form supports editing) or "Fixed — send back for review" with a note
export function SubmissionDetailPage({ store, submission, onBack, canStamp, onStamp, onReject, onEdit }: {
  store: Store;
  submission: Submission;
  onBack: () => void;
  canStamp?: boolean;
  onStamp?: (signature?: string) => void;
  onReject?: (reason: string) => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, submissions, sendBack, resolveReturned, deleteSubmission, resubmitAfterRejection } = store;
  const [resolveNote, setResolveNote] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signing, setSigning] = useState(false);
  // Always show the live copy, so a stamp / return updates the page in place.
  const live = submissions.find(x => x.id === submission.id) || submission;
  // Older stamps were saved without the reviewer's role — fill it in from
  // the user list so every paper stamp reads e.g. "APPROVED BY SUPERVISOR".
  const s = useMemo(() => withStampRoles(live, store.users || []), [live, store.users]);
  const titleKey = titleKeyForChainType(s.type);
  const PrintSheet = OPS_PRINT_COMPONENTS[s.type];
  const isOwner = s.userId === currentUser?.id;
  const superior = canManageSubmission(currentUser, s);
  const canReturn = superior && s.status !== 'REJECTED' && !canStamp;
  const canFix = isOwner && s.status === 'REJECTED';
  // Sent back to a reviewer lower in the chain (e.g. Manager → Supervisor),
  // not fixed yet: that reviewer (or whoever can stamp that step) fixes it
  // and sends it back up.
  const ret = s.meta?.returned;
  const backToReviewer = s.status === 'PENDING' && ret?.to === 'reviewer' && !ret.resolved;
  const canResolve = backToReviewer && !isOwner && (ret?.toUserId === currentUser?.id || (!!canStamp && nextSignoffStep(s) === ret?.toStep));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest hover:text-psu-gray transition-colors py-2">
          <ChevronLeft size={16} /> {t('inspection.backToList')}
        </button>
        {PrintSheet && (
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-psu-gray/5 text-psu-gray px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Printer size={14} /> {t('common.printButton')}
          </button>
        )}
      </div>

      {PrintSheet && <div className="hidden print:block"><PrintSheet submission={s} allSubmissions={submissions.filter(x => !x.deletedAt)} /></div>}

      <div className="print:hidden space-y-6">
        <div className="card space-y-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-psu-gray">{titleKey ? t(titleKey) : s.type}</h2>
            <p className="text-xs text-psu-gray/40 font-black uppercase tracking-widest mt-1">
              {s.userName} · {t(`rolesShort.${s.role}`)} · {s.siteName} · {new Date(s.timestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <SignoffProgress submission={s} />

          {isNotReadyToWork(s) && (
            <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-psu-rejected shrink-0" size={20} />
              <p className="text-xs font-bold text-psu-rejected">{t('supervisorHK.notReadyDetailBanner')}</p>
            </div>
          )}

          {s.status === 'REJECTED' && (s.meta?.returned || s.rejectionReason) && (
            <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-psu-rejected uppercase tracking-widest">
                {s.meta?.returned ? t('ops.chain.returnedBanner', { name: s.meta.returned.name, role: t(`rolesShort.${s.meta.returned.role}`) }) : t('ops.signoff.rejectedBanner')}
              </p>
              <p className="text-xs text-psu-gray/70 font-medium">{s.meta?.returned?.note || s.rejectionReason}</p>
              {isOwner
                ? <p className="text-[11px] text-psu-gray/50">{t('ops.chain.ownerHint')}</p>
                : <p className="text-[11px] font-bold text-psu-gray/50">{t('ops.chain.waitingFix', { name: s.userName })}</p>}
            </div>
          )}

          {backToReviewer && ret && (
            <div className="bg-psu-warning/10 border border-psu-warning/30 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-psu-warning uppercase tracking-widest">
                {t('ops.chain.sentBackToReviewerBanner', { name: ret.name, role: t(`rolesShort.${ret.role}`), to: ret.toName || '' })}
              </p>
              <p className="text-sm text-psu-gray font-medium">“{ret.note}”</p>
              <p className="text-[11px] font-bold text-psu-gray/50">
                {canResolve ? t('ops.chain.reviewerHint') : t('ops.chain.waitingFix', { name: ret.toName || '' })}
              </p>
            </div>
          )}

          {s.status !== 'REJECTED' && s.meta?.returned && !backToReviewer && (
            <div className="bg-psu-warning/10 border border-psu-warning/20 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-psu-warning uppercase tracking-widest">{t('ops.chain.wasReturned', { name: s.meta.returned.name })}</p>
              <p className="text-xs text-psu-gray/70">{s.meta.returned.note}</p>
              {s.meta.returned.resolved
                ? <p className="text-xs text-psu-gray/70"><b>{t('ops.chain.fixNoteLabel')} ({s.meta.returned.resolved.name}):</b> {s.meta.returned.resolved.note}</p>
                : s.meta.fixNote && <p className="text-xs text-psu-gray/70"><b>{t('ops.chain.fixNoteLabel')}:</b> {s.meta.fixNote}</p>}
            </div>
          )}

          {s.wasApprovedBeforeEdit && (
            <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 flex items-center gap-3">
              <Pencil className="text-psu-rejected shrink-0" size={18} />
              <p className="text-xs font-bold text-psu-rejected">{t('ops.signoff.editedAfterApprovalBanner')}</p>
            </div>
          )}

          {(canStamp || canReturn || superior || canFix || canResolve) && (
            <div className="space-y-3">
              {canResolve && (
                <NoteAction tone="blue" icon={<Send size={16} />} label={t('ops.chain.resolveButton', { name: ret?.name || '' })}
                  placeholder={t('ops.chain.resolvePlaceholder')} confirmLabel={t('ops.chain.resolveConfirm')}
                  onConfirm={(note) => setResolveNote(note)} />
              )}
              {canResolve && (
                <SignatureStampDialog open={resolveNote !== null} userId={currentUser?.id}
                  stepLabel={ret?.toStep ? t(`ops.signoff.${ret.toStep}`) : ''}
                  onCancel={() => setResolveNote(null)}
                  onConfirm={(sig) => { resolveReturned(s.id, resolveNote || '', sig); setResolveNote(null); onBack(); }} />
              )}
              {canStamp && onStamp && !backToReviewer && (
                <button onClick={() => setSigning(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all">
                  <Stamp size={16} /> {t('ops.stampButton')} — {t(`ops.signoff.${nextSignoffStep(s)}`)}
                </button>
              )}
              {canStamp && onStamp && (
                <SignatureStampDialog open={signing} userId={currentUser?.id}
                  stepLabel={t(`ops.signoff.${nextSignoffStep(s)}`)}
                  onCancel={() => setSigning(false)}
                  onConfirm={(sig) => { setSigning(false); onStamp(sig); }} />
              )}
              {canStamp && onReject && (
                <SendBackAction s={s} me={currentUser?.id} tone="reject" label={t('ops.signoff.rejectButton')}
                  onConfirm={(note, target) => { sendBack(s.id, note, target); onBack(); }} />
              )}
              {canReturn && (
                <SendBackAction s={s} me={currentUser?.id} tone="warn" label={t('ops.chain.returnButton')}
                  onConfirm={(note, target) => sendBack(s.id, note, target)} />
              )}
              {canFix && onEdit && (
                <button onClick={onEdit}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-psu-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all">
                  <Pencil size={16} /> {t('ops.signoff.editAndResubmit')}
                </button>
              )}
              {canFix && (
                <NoteAction tone="blue" icon={<Send size={16} />} label={t('ops.chain.fixedButton')}
                  placeholder={t('ops.chain.fixedPlaceholder')} confirmLabel={t('ops.chain.fixedConfirm')}
                  onConfirm={(note) => resubmitAfterRejection(s.id, { meta: { ...s.meta, fixNote: note } })} />
              )}
              {superior && (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-psu-rejected/70 hover:text-psu-rejected font-black text-[10px] uppercase tracking-widest">
                  <Trash2 size={14} /> {t('ops.chain.deleteButton')}
                </button>
              )}
            </div>
          )}

          {s.meta?.photoUrl && (
            <button type="button" onClick={() => setLightboxUrl(cloudinaryUrl(s.meta!.photoUrl, 1600) ?? null)} className="block w-full rounded-2xl overflow-hidden border border-psu-gray/5">
              <img src={cloudinaryUrl(s.meta.photoUrl, 1000)} className="w-full h-48 md:h-64 object-cover" alt="Proof" />
            </button>
          )}
        </div>

        {PrintSheet ? (
          <>
            <PaperViewer landscape={LANDSCAPE_SHEETS.has(s.type)}>
              <PrintSheet submission={s} allSubmissions={submissions.filter(x => !x.deletedAt)} />
            </PaperViewer>
            {s.items.some(i => i.photoUrl) && (
              <div className="card space-y-3">
                <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.paper.photos')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {s.items.filter(i => i.photoUrl).map((item, idx) => (
                    <button key={idx} type="button" onClick={() => setLightboxUrl(cloudinaryUrl(item.photoUrl, 1600) ?? null)} className="text-left">
                      <img src={cloudinaryUrl(item.photoUrl, 500)} className="w-full h-32 object-cover rounded-xl" alt="" />
                      <p className="text-[10px] text-psu-gray/60 mt-1 line-clamp-2">{item.question}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {s.items.map((item, idx) => (
              <div key={idx} className="bg-white border border-psu-gray/10 p-4 rounded-2xl">
                <p className="text-xs font-bold text-psu-gray">{item.question}</p>
                {item.answer !== '' && item.answer !== undefined && (
                  <p className="text-xs text-psu-gray/60 mt-1 flex items-center gap-1.5">
                    {item.answer === true && <CheckCircle2 size={13} className="text-psu-green shrink-0" />}
                    {item.answer === false && <XCircle size={13} className="text-psu-rejected shrink-0" />}
                    {item.answer === true ? t('supervisorHK.pass') : item.answer === false ? t('supervisorHK.fail') : String(item.answer)}
                  </p>
                )}
                {item.remarks && <p className="text-[10px] text-psu-gray/40 mt-1 italic">{item.remarks}</p>}
                {item.photoUrl && (
                  <button type="button" onClick={() => setLightboxUrl(cloudinaryUrl(item.photoUrl, 1600) ?? null)} className="block mt-2">
                    <img src={cloudinaryUrl(item.photoUrl, 500)} className="w-full h-32 object-cover rounded-xl" alt="" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={confirmDelete}
        title={t('ops.chain.deleteTitle')}
        body={t('ops.chain.deleteBody', { name: s.userName })}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { deleteSubmission(s.id); setConfirmDelete(false); onBack(); }}
      />
      <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
