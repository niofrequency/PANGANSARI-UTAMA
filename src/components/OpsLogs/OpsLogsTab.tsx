import { useState, ComponentType } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Modal } from '../Modal';
import { Lightbox } from '../Lightbox';
import { ListCard } from '../ListCard';
import { SubmissionHistoryList } from '../SubmissionHistoryList';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Stamp, Pencil, AlertTriangle, Printer } from 'lucide-react';
import { Submission, OpsLogType } from '../../types';
import { OPS_LOG_DEFS, OpsDepartment, departmentOf, titleKeyForChainType } from '../../data/opsLogsCatalog';
import { SignoffProgress, nextSignoffStep, RejectButton, OpsFormProps } from './opsHelpers';
import { userCanSeeSite } from '../../lib/siteScope';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';
import { DAILY_FOOD_HANDLER_ALL_CRITERIA } from '../../data/dailyFoodHandlerData';
import { MessHallHygieneForm } from './MessHallHygieneForm';
import { CookingServiceForm } from './CookingServiceForm';
import { HotPackedMealForm } from './HotPackedMealForm';
import { ThawingForm } from './ThawingForm';
import { StaffReadyForm } from './StaffReadyForm';
import { LaundryShopForm } from './LaundryShopForm';
import { RestroomForm } from './RestroomForm';
import { MessHallHygienePrintSheet } from './print/MessHallHygienePrintSheet';
import { CookingServicePrintSheet } from './print/CookingServicePrintSheet';
import { HotPackedMealPrintSheet } from './print/HotPackedMealPrintSheet';
import { ThawingPrintSheet } from './print/ThawingPrintSheet';
import { StaffReadyPrintSheet } from './print/StaffReadyPrintSheet';
import { LaundryShopPrintSheet } from './print/LaundryShopPrintSheet';
import { RestroomPrintSheet } from './print/RestroomPrintSheet';
import { RoomCleaningPrintSheet } from './print/RoomCleaningPrintSheet';
import { FoodSafetyDailyLogPrintSheet } from './print/FoodSafetyDailyLogPrintSheet';

// One print sheet per type this tab's shared detail modal can show —
// every Ops Log type, plus the 2 review-only types (HOUSEKEEPING/
// FOOD_SAFETY) that share this same modal. Only Supervisor/Manager/GM/
// Admin ever reach this modal (see this file's own header comment), so
// the Print button below needs no extra role check of its own — same
// reasoning as InspectionsTab.tsx's report views. Gemba Walk (the third
// review-only type) already has its own Print button on
// GembaWalkReportView.tsx and isn't duplicated here.
const OPS_PRINT_COMPONENTS: Partial<Record<Submission['type'], ComponentType<{ submission: Submission }>>> = {
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

// A Food Safety Technician's daily log folds in a personal wellness/
// hygiene/PPE self-check. If any of those items came back false, that's
// not a routine failed checklist item, it's someone reporting they may
// not be fit to handle food — worth surfacing before a reviewer opens the
// card, not just visible once they do. Carried over from the old Field
// Queue/Escalations screens this tab absorbed.
const isNotReadyToWork = (s: Submission) =>
  s.type === 'FOOD_SAFETY' &&
  DAILY_FOOD_HANDLER_ALL_CRITERIA.some(c => s.items.find(i => i.id === c.id)?.answer === false);

// Which OpsLogTypes actually reconstruct their form state from an
// existing submission (see each form's own `editingSubmission` handling)
// — Restroom and Laundry Shop's inputs map directly onto stored fields,
// so editing them is exact. The other five (Mess Hall Hygiene, Cooking &
// Service, Hot Packed Meal, Thawing, Staff Ready) have more deeply nested
// per-meal/per-row state that isn't fully captured in `items`/`meta` yet
// — until that's added, "Edit & Resubmit" stays hidden for those so a
// reopen can't silently lose data; Reject still works for all seven.
const EDITABLE_OPS_LOG_TYPES: OpsLogType[] = ['RESTROOM', 'LAUNDRY_SHOP'];

const FORM_COMPONENTS: Record<OpsLogType, ComponentType<OpsFormProps>> = {
  MESS_HALL_HYGIENE: MessHallHygieneForm,
  COOKING_SERVICE: CookingServiceForm,
  HOT_PACKED_MEAL: HotPackedMealForm,
  THAWING: ThawingForm,
  STAFF_READY: StaffReadyForm,
  LAUNDRY_SHOP: LaundryShopForm,
  RESTROOM: RestroomForm,
};

// Shared review queue for every submission with a named sign-off chain —
// the 7 Ops Log forms, plus (as of the Escalations/Ops Logs merge) the
// Technician's daily Food Safety log, Housekeeper's Room Cleaning, and
// Gemba Walk. Used by both Supervisor portals (fill + stamp/reject the
// first review step) and both Manager portals / GM (stamp/reject the
// later approve/verify steps). The 3 merged-in types are still filled
// through their own dedicated portals (TechnicianPortal, HousekeeperPortal,
// InspectionsTab) — REVIEW_ONLY_TITLE_KEY covers just their display here.
export function OpsLogsTab({
  store, department, tier,
}: {
  store: ReturnType<typeof useAppStore>;
  department: OpsDepartment;
  tier: 'supervisor' | 'manager';
}) {
  const { t, language } = useTranslation();
  const { currentUser, submissions, addSignoffStamp, rejectSignoff } = store;
  const [openType, setOpenType] = useState<OpsLogType | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const defs = OPS_LOG_DEFS.filter(d => d.department === department);
  const fillableDefs = tier === 'supervisor'
    ? defs.filter(d => currentUser && d.fillerRoles.includes(currentUser.role as any))
    : [];

  const titleKeyFor = (s: Submission): string | undefined => titleKeyForChainType(s.type);

  // Site-scoped per lib/siteScope.ts — Home Site by default, or wider if
  // the Admin gave this Supervisor/Manager/GM a Site Access override.
  // departmentOf() covers all 10 sign-off-chain types now, including
  // Gemba Walk's role-based split (HK Supervisor's Section-A walk vs FS
  // Supervisor's full walk — see that function's own comment).
  const inScope = (s: Submission) => departmentOf(s) === department && userCanSeeSite(currentUser, s.siteId);

  // "Needs your stamp": PENDING items whose next required step matches
  // this tier — checkedBy for a Supervisor's queue, approvedBy/verifiedBy
  // for a Manager's. A form whose chain skips straight to approvedBy
  // (e.g. STAFF_READY, Gemba Walk) never shows up in the Supervisor's
  // queue at all.
  const queue = submissions.filter(s => {
    if (s.status !== 'PENDING' || !inScope(s)) return false;
    const step = nextSignoffStep(s);
    if (!step) return false;
    return tier === 'supervisor' ? step === 'checkedBy' : step === 'approvedBy' || step === 'verifiedBy';
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const history = submissions.filter(inScope).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleStamp = (s: Submission) => {
    const step = nextSignoffStep(s);
    if (step) addSignoffStamp(s.id, step);
    setSelected(null);
  };

  const handleReject = (s: Submission, reason: string) => {
    rejectSignoff(s.id, reason);
    setSelected(null);
  };

  // Only reachable for one of this tab's own 5 fillable types, and only
  // when it's genuinely this person's own rejected entry — a Supervisor
  // reviewing someone else's rejected submission just sees the reason,
  // not an edit button (see the detail modal below).
  const handleEdit = (s: Submission) => {
    setSelected(null);
    setEditing(s);
  };

  if (openType) {
    const FormComponent = FORM_COMPONENTS[openType];
    return <FormComponent store={store} onCancel={() => setOpenType(null)} onSubmitted={() => setOpenType(null)} />;
  }

  if (editing) {
    const FormComponent = FORM_COMPONENTS[editing.type as OpsLogType];
    return (
      <FormComponent
        store={store}
        editingSubmission={editing}
        onCancel={() => setEditing(null)}
        onSubmitted={() => setEditing(null)}
      />
    );
  }

  // Mobile/tablet popup content (below lg) — the Modal that used to be
  // the only way this detail was ever shown. From lg up, a dedicated
  // full-page view takes over instead (renderDesktopPage below); this one
  // is now mobile-only.
  const renderDetailPanel = (selected: Submission) => (
    <>
      {/* Only Supervisor/Manager/GM/Admin ever reach this panel — see
          this file's header comment — so the Print button needs no
          extra role check of its own. OPS_PRINT_COMPONENTS covers every
          type this panel can show except Gemba Walk, which already has
          its own Print button on GembaWalkReportView.tsx. */}
      {OPS_PRINT_COMPONENTS[selected.type] && (() => {
        const PrintSheet = OPS_PRINT_COMPONENTS[selected.type]!;
        return <div className="hidden print:block"><PrintSheet submission={selected} /></div>;
      })()}
      <div className="p-8 overflow-y-auto print:hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-psu-gray">{titleKeyFor(selected) ? t(titleKeyFor(selected)!) : selected.type}</h3>
            <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">{selected.userName} · {selected.siteName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {OPS_PRINT_COMPONENTS[selected.type] && (
              <button onClick={() => window.print()} className="p-2 text-psu-gray/30 hover:text-psu-blue transition-colors" title={t('common.printButton')}>
                <Printer size={20} />
              </button>
            )}
            <button onClick={() => setSelected(null)} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors"><XCircle size={22} /></button>
          </div>
        </div>

        <div className="mb-5"><SignoffProgress submission={selected} /></div>

        {isNotReadyToWork(selected) && (
          <div className="mb-5 bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-psu-rejected shrink-0" size={20} />
            <p className="text-xs font-bold text-psu-rejected">{t('supervisorHK.notReadyDetailBanner')}</p>
          </div>
        )}

        {selected.status === 'REJECTED' && selected.rejectionReason && (
          <div className="mb-5 bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] font-black text-psu-rejected uppercase tracking-widest">{t('ops.signoff.rejectedBanner')}</p>
            <p className="text-xs text-psu-gray/70 font-medium">{selected.rejectionReason}</p>
          </div>
        )}

        {/* HOUSEKEEPING (UN.00.65): one proof photo for the whole
            submission, not per item. */}
        {selected.meta?.photoUrl && (
          <button
            type="button"
            onClick={() => setLightboxUrl(cloudinaryUrl(selected.meta!.photoUrl, 1600) ?? null)}
            className="block w-full mb-5 rounded-2xl overflow-hidden border border-psu-gray/5"
          >
            <img src={cloudinaryUrl(selected.meta.photoUrl, 800)} className="w-full h-48 object-cover" alt="Proof" />
          </button>
        )}

        <div className="space-y-3">
          {selected.items.map((item, idx) => (
            <div key={idx} className="bg-psu-bg border border-psu-gray/10 p-4 rounded-2xl">
              <p className="text-xs font-bold text-psu-gray">{item.question}</p>
              {item.answer !== '' && (
                <p className="text-xs text-psu-gray/60 mt-1">
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

      {selected.status === 'PENDING' && nextSignoffStep(selected) && (tier === 'supervisor' ? nextSignoffStep(selected) === 'checkedBy' : true) && (
        <div className="p-6 bg-psu-bg/30 border-t border-psu-gray/5 space-y-3 print:hidden">
          <button onClick={() => handleStamp(selected)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
          >
            <Stamp size={16} /> {t('ops.stampButton')} — {t(`ops.signoff.${nextSignoffStep(selected)}`)}
          </button>
          <div className="flex">
            <RejectButton onReject={(reason) => handleReject(selected, reason)} />
          </div>
        </div>
      )}

      {selected.status === 'REJECTED' && selected.userId === currentUser?.id && EDITABLE_OPS_LOG_TYPES.includes(selected.type as OpsLogType) && (
        <div className="p-6 bg-psu-bg/30 border-t border-psu-gray/5 print:hidden">
          <button onClick={() => handleEdit(selected)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-psu-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all"
          >
            <Pencil size={16} /> {t('ops.signoff.editAndResubmit')}
          </button>
        </div>
      )}
    </>
  );

  // Desktop-only (lg and up) — a dedicated full-width page instead of a
  // popup, navigated to by selecting a queue/history row and back out of
  // via the button below, the same "list page ↔ detail page" navigation
  // InspectionsTab.tsx's audit report views already use. Not a sidebar
  // next to the list — the list is hidden entirely while this is open
  // (see the render below), so the checklist gets the full page instead
  // of sharing it. Below lg this never renders at all; the mobile popup
  // (renderDetailPanel above) is what shows instead.
  const renderDesktopPage = (selected: Submission) => {
    const canStamp = selected.status === 'PENDING' && nextSignoffStep(selected) && (tier === 'supervisor' ? nextSignoffStep(selected) === 'checkedBy' : true);
    const canEdit = selected.status === 'REJECTED' && selected.userId === currentUser?.id && EDITABLE_OPS_LOG_TYPES.includes(selected.type as OpsLogType);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest hover:text-psu-gray transition-colors">
            <ChevronLeft size={16} /> {t('inspection.backToList')}
          </button>
          {OPS_PRINT_COMPONENTS[selected.type] && (
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-psu-gray/5 text-psu-gray px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              <Printer size={14} /> {t('common.printButton')}
            </button>
          )}
        </div>

        {OPS_PRINT_COMPONENTS[selected.type] && (() => {
          const PrintSheet = OPS_PRINT_COMPONENTS[selected.type]!;
          return <div className="hidden print:block"><PrintSheet submission={selected} /></div>;
        })()}

        <div className="print:hidden grid grid-cols-3 gap-6 items-start">
          <div className="col-span-2 space-y-6">
            <div className="card space-y-4">
              <div>
                <h2 className="text-2xl font-black text-psu-gray">{titleKeyFor(selected) ? t(titleKeyFor(selected)!) : selected.type}</h2>
                <p className="text-xs text-psu-gray/40 font-black uppercase tracking-widest mt-1">{selected.userName} · {selected.siteName}</p>
              </div>

              <SignoffProgress submission={selected} />

              {isNotReadyToWork(selected) && (
                <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 flex items-center gap-3">
                  <AlertTriangle className="text-psu-rejected shrink-0" size={20} />
                  <p className="text-xs font-bold text-psu-rejected">{t('supervisorHK.notReadyDetailBanner')}</p>
                </div>
              )}

              {selected.status === 'REJECTED' && selected.rejectionReason && (
                <div className="bg-psu-rejected/10 border border-psu-rejected/20 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-black text-psu-rejected uppercase tracking-widest">{t('ops.signoff.rejectedBanner')}</p>
                  <p className="text-xs text-psu-gray/70 font-medium">{selected.rejectionReason}</p>
                </div>
              )}

              {/* HOUSEKEEPING (UN.00.65): one proof photo for the whole
                  submission, not per item. */}
              {selected.meta?.photoUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxUrl(cloudinaryUrl(selected.meta!.photoUrl, 1600) ?? null)}
                  className="block w-full rounded-2xl overflow-hidden border border-psu-gray/5"
                >
                  <img src={cloudinaryUrl(selected.meta.photoUrl, 1000)} className="w-full h-64 object-cover" alt="Proof" />
                </button>
              )}
            </div>

            {/* The full checklist, 2-up — a real submission can be a
                couple dozen rows, and this now has the whole page to lay
                them out in instead of a narrow single column. */}
            <div className="grid grid-cols-2 gap-3">
              {selected.items.map((item, idx) => (
                <div key={idx} className="bg-white border border-psu-gray/10 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-psu-gray">{item.question}</p>
                  {item.answer !== '' && (
                    <p className="text-xs text-psu-gray/60 mt-1">
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

          {/* Actions — its own card in a sticky sidebar, rather than
              buried at the bottom of a scrolling column, so Stamp/Reject/
              Edit stay reachable no matter how long the checklist is. */}
          {(canStamp || canEdit) && (
            <div className="col-span-1 sticky top-6">
              <div className="card space-y-3">
                {canStamp && (
                  <>
                    <button onClick={() => handleStamp(selected)}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                    >
                      <Stamp size={16} /> {t('ops.stampButton')} — {t(`ops.signoff.${nextSignoffStep(selected)}`)}
                    </button>
                    {/* RejectButton's own button is flex-1 — it only
                        stretches full-width inside a flex wrapper, same
                        as the mobile popup below gives it. */}
                    <div className="flex">
                      <RejectButton onReject={(reason) => handleReject(selected, reason)} />
                    </div>
                  </>
                )}
                {canEdit && (
                  <button onClick={() => handleEdit(selected)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-psu-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all"
                  >
                    <Pencil size={16} /> {t('ops.signoff.editAndResubmit')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Desktop full page (lg and up) — replaces the list entirely while
          open; see the list's own lg:hidden below. */}
      {selected && (
        <div className="hidden lg:block">
          {renderDesktopPage(selected)}
        </div>
      )}

      <div className={cn("space-y-6", selected && "lg:hidden")}>
      {fillableDefs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] px-2">{t('ops.fillSectionTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fillableDefs.map(def => (
              <button
                key={def.type}
                onClick={() => setOpenType(def.type)}
                className="card text-left flex items-start gap-4 hover:border-psu-blue/20 transition-all active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-psu-blue/10 text-psu-blue flex items-center justify-center shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-psu-gray truncate">{t(def.titleKey)}</h4>
                  <p className="text-[10px] text-psu-gray/40 font-medium mt-1 leading-relaxed">{t(def.descKey)}</p>
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mt-1.5">{def.formId}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{t('ops.queueSectionTitle')}</h3>
          <span className="bg-psu-blue/10 text-psu-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {queue.length} {t('supervisorHK.pendingCount')}
          </span>
        </div>
        <ListCard
          items={queue}
          emptyIcon={<CheckCircle2 size={48} className="mx-auto" />}
          emptyLabel={t('supervisorHK.allClear')}
          rowClassName={(s) => isNotReadyToWork(s) ? "bg-psu-rejected/5" : undefined}
          renderRow={(s) => {
            const titleKey = titleKeyFor(s);
            const flagged = isNotReadyToWork(s);
            return (
              <div onClick={() => setSelected(s)} className="cursor-pointer flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-psu-gray truncate">{titleKey ? t(titleKey) : s.type}</h4>
                  <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                    {s.userName} · {s.siteName} · {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  {flagged && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected bg-psu-rejected/10 px-2 py-0.5 rounded-full mt-1.5">
                      <AlertTriangle size={10} /> {t('supervisorHK.notReadyFlag')}
                    </span>
                  )}
                  <div className="mt-2"><SignoffProgress submission={s} /></div>
                </div>
                <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
              </div>
            );
          }}
        />
      </div>

      <button
        onClick={() => setHistoryOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-3 text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]"
      >
        {t('ops.historySectionTitle')} ({history.length})
        <ChevronRight size={14} className={cn("transition-transform", historyOpen && "rotate-90")} />
      </button>
      <AnimatePresence>
        {historyOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <SubmissionHistoryList
              submissions={history}
              emptyIcon={<ClipboardList size={48} className="mx-auto" />}
              emptyLabel={t('common.noData')}
              renderRow={(s) => {
                const titleKey = titleKeyFor(s);
                return (
                  <div onClick={() => setSelected(s)} className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                        s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue")}>
                        {s.status === 'APPROVED' ? <CheckCircle2 size={20} /> : s.status === 'REJECTED' ? <XCircle size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-psu-gray truncate">{titleKey ? t(titleKey) : s.type}</h4>
                        <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                          {s.userName} · {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
                  </div>
                );
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Mobile/tablet only (below lg) — the desktop full page above
          takes over from lg up, see backdropClassName below. */}
      <AnimatePresence>
        {selected && (
          <Modal
            size="md"
            backdropClassName="print:static print:inset-auto print:block print:p-0 print:bg-transparent print:backdrop-blur-none lg:hidden"
            boxClassName="rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] print:block print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none"
          >
            {renderDetailPanel(selected)}
          </Modal>
        )}
      </AnimatePresence>

      <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
