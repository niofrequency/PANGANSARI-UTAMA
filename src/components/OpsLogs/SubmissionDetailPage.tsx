import { ComponentType, ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, CornerUpLeft, Pencil, Printer, Send, Stamp, Trash2, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { titleKeyForChainType } from '../../data/opsLogsCatalog';
import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from '../../data/dailyFoodHandlerData';
import { canManageSubmission } from '../../lib/submissionAuthority';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';
import { cn } from '../../utils/cn';
import { Lightbox } from '../Lightbox';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SignoffProgress, nextSignoffStep, RejectButton } from './opsHelpers';
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

type Store = ReturnType<typeof useAppStore>;

// Paper-replica print sheet per log type (Gemba Walk prints from its own
// report view).
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
};

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
    const onPop = () => closeRef.current();
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
  onStamp?: () => void;
  onReject?: (reason: string) => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, submissions, returnSubmission, deleteSubmission, resubmitAfterRejection } = store;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Always show the live copy, so a stamp / return updates the page in place.
  const s = submissions.find(x => x.id === submission.id) || submission;
  const titleKey = titleKeyForChainType(s.type);
  const PrintSheet = OPS_PRINT_COMPONENTS[s.type];
  const isOwner = s.userId === currentUser?.id;
  const superior = canManageSubmission(currentUser, s);
  const canReturn = superior && s.status !== 'REJECTED' && !canStamp;
  const canFix = isOwner && s.status === 'REJECTED';

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
              {isOwner && <p className="text-[11px] text-psu-gray/50">{t('ops.chain.ownerHint')}</p>}
            </div>
          )}

          {s.status !== 'REJECTED' && s.meta?.returned && (
            <div className="bg-psu-warning/10 border border-psu-warning/20 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-psu-warning uppercase tracking-widest">{t('ops.chain.wasReturned', { name: s.meta.returned.name })}</p>
              <p className="text-xs text-psu-gray/70">{s.meta.returned.note}</p>
              {s.meta.fixNote && <p className="text-xs text-psu-gray/70"><b>{t('ops.chain.fixNoteLabel')}:</b> {s.meta.fixNote}</p>}
            </div>
          )}

          {s.wasApprovedBeforeEdit && (
            <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 flex items-center gap-3">
              <Pencil className="text-psu-rejected shrink-0" size={18} />
              <p className="text-xs font-bold text-psu-rejected">{t('ops.signoff.editedAfterApprovalBanner')}</p>
            </div>
          )}

          {(canStamp || canReturn || superior || canFix) && (
            <div className="space-y-3">
              {canStamp && onStamp && (
                <button onClick={onStamp}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all">
                  <Stamp size={16} /> {t('ops.stampButton')} — {t(`ops.signoff.${nextSignoffStep(s)}`)}
                </button>
              )}
              {canStamp && onReject && <div className="flex"><RejectButton onReject={onReject} /></div>}
              {canReturn && (
                <NoteAction tone="warn" icon={<CornerUpLeft size={16} />} label={t('ops.chain.returnButton')}
                  placeholder={t('ops.chain.returnPlaceholder')} confirmLabel={t('ops.chain.returnConfirm')}
                  onConfirm={(note) => returnSubmission(s.id, note)} />
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
