import { useState, ComponentType } from 'react';
import { useFixEditor } from '../../lib/fixEditors';
import { useAppStore } from '../../store/useAppStore';
import { ListCard } from '../ListCard';
import { SubmissionHistoryList } from '../SubmissionHistoryList';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { stampProblem } from '../../lib/logLifecycle';
import { ClipboardList, ChevronRight, CheckCircle2, XCircle, Clock, Pencil, AlertTriangle, CornerUpLeft } from 'lucide-react';
import { Submission, OpsLogType } from '../../types';
import { OPS_LOG_DEFS, OpsDepartment, departmentOf, titleKeyForChainType } from '../../data/opsLogsCatalog';
import { SignoffProgress, nextSignoffStep, OpsFormProps } from './opsHelpers';
import { userCanSeeSite } from '../../lib/siteScope';
import { MessHallHygieneForm } from './MessHallHygieneForm';
import { CookingServiceForm } from './CookingServiceForm';
import { HotPackedMealForm } from './HotPackedMealForm';
import { ThawingForm } from './ThawingForm';
import { StaffReadyForm } from './StaffReadyForm';
import { LaundryShopForm } from './LaundryShopForm';
import { RestroomForm } from './RestroomForm';
import { TempControlForm } from './TempControlForm';
import { DishwashForm } from './DishwashForm';
import { SubmissionDetailPage, isNotReadyToWork, useBackToClose } from './SubmissionDetailPage';

// Which OpsLogTypes actually reconstruct their form state from an
// existing submission (see each form's own `editingSubmission` handling)
// — Restroom and Laundry Shop's inputs map directly onto stored fields,
// so editing them is exact. TEMP_CONTROL/DISHWASH_TEMP don't take
// editingSubmission at all: they're "one submission per asset per day"
// standing sheets (see TempControlForm.tsx's header comment) — reopening
// today's own entry to add another slot just means opening the form
// again and picking the same asset, not a separate Edit flow. The other
// four (Mess Hall Hygiene, Cooking & Service, Hot Packed Meal, Staff
// Ready) have more deeply nested per-meal/per-row state that isn't fully
// captured in `items`/`meta` yet — until that's added, "Edit & Resubmit"
// stays hidden for those so a reopen can't silently lose data; Reject
// still works for all nine.
const EDITABLE_OPS_LOG_TYPES: OpsLogType[] = ['RESTROOM', 'LAUNDRY_SHOP'];

const FORM_COMPONENTS: Record<OpsLogType, ComponentType<OpsFormProps>> = {
  TEMP_CONTROL: TempControlForm,
  DISHWASH_TEMP: DishwashForm,
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
  store, department, tier, mode = 'full',
}: {
  store: ReturnType<typeof useAppStore>;
  department: OpsDepartment;
  tier: 'supervisor' | 'manager';
  // Both Supervisor and Manager Portals give History its own top-level
  // tab (queueOnly for the Ops Logs tab, historyOnly for the History tab)
  // rather than nesting it as a disclosure — the two OpsLogsTab instances
  // share nothing but this component's code; each mounts its own state.
  // 'full' (the fillable-forms grid, if any, + queue + a collapsible
  // History all in one screen) is kept as the default for any future
  // caller that wants the original single-screen layout, but nothing
  // currently uses it.
  mode?: 'full' | 'queueOnly' | 'historyOnly';
}) {
  const { t, language } = useTranslation();
  const { currentUser, submissions, addSignoffStamp, rejectSignoff } = store;
  const [openType, setOpenType] = useState<OpsLogType | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);

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
  // Only logs this person can actually stamp: not their own, and not one
  // where they already stamped another step (one person never signs two
  // steps of the same log — see lib/logLifecycle.ts's stampProblem).
  const tierStep = (step?: string) => tier === 'supervisor' ? step === 'checkedBy' : step === 'approvedBy' || step === 'verifiedBy';
  const canStampLog = (s: Submission) => {
    const step = nextSignoffStep(s);
    return !!step && !!currentUser && tierStep(step) && !stampProblem(s, currentUser.id, step);
  };
  const queue = submissions.filter(s => inScope(s) && canStampLog(s)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const history = submissions.filter(inScope).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleStamp = async (s: Submission, signature?: string) => {
    const step = nextSignoffStep(s);
    if (!step) return;
    const result = await addSignoffStamp(s.id, step, signature);
    if (result) {
      toast.success(t(result === 'approved' ? 'logOk.approved' : 'logOk.stamped'));
      closeDetail();
    }
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
  useFixEditor((s) => s.userId === currentUser?.id && EDITABLE_OPS_LOG_TYPES.includes(s.type as OpsLogType), handleEdit);

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

  const closeDetail = () => setSelected(null);
  useBackToClose(!!selected, closeDetail);

  // Logs a Supervisor/Manager (or anyone up the chain) sent back for
  // correction, still waiting for the filer to fix them — shown to the
  // whole chain until resolved.
  const returnedWaiting = submissions.filter(s => !s.deletedAt && inScope(s) && (s.status === 'REJECTED'
    || (s.status === 'PENDING' && s.meta?.returned?.to === 'reviewer' && !s.meta.returned.resolved)))
    .sort((a, b) => new Date(b.meta?.returned?.at || b.timestamp).getTime() - new Date(a.meta?.returned?.at || a.timestamp).getTime());

  // Shared between the two places History can render (the collapsible
  // disclosure in 'full'/Manager Portal mode, and the plain list under its
  // own tab in Supervisor Portal's 'historyOnly' mode) — same row, just a
  // different container around it.
  const historyRenderRow = (s: Submission) => {
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
            {s.wasApprovedBeforeEdit && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected bg-psu-rejected/10 px-2 py-0.5 rounded-full mt-1.5">
                <Pencil size={10} /> {t('ops.signoff.editedAfterApproval')}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
      </div>
    );
  };

  // A log opens as its own page (every screen size), not a popup; Back —
  // the page's button or the phone/browser's — returns to this list.
  if (selected) {
    const step = nextSignoffStep(selected);
    const live = submissions.find(x => x.id === selected.id) || selected;
    const canStamp = canStampLog(live) && !!step;
    const editable = selected.userId === currentUser?.id && EDITABLE_OPS_LOG_TYPES.includes(selected.type as OpsLogType);
    return (
      <SubmissionDetailPage
        store={store}
        submission={selected}
        onBack={() => window.history.state?.psuDetail ? window.history.back() : closeDetail()}
        canStamp={canStamp}
        onStamp={(signature) => handleStamp(selected, signature)}
        onReject={(reason) => handleReject(selected, reason)}
        onEdit={editable ? () => handleEdit(selected) : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
      {mode !== 'historyOnly' && fillableDefs.length > 0 && (
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

      {mode !== 'historyOnly' && (
        <div className="space-y-3">
          <button
            onClick={() => setQueueOpen(o => !o)}
            className="w-full flex items-center justify-between px-2 py-3"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">
              {t('ops.queueSectionTitle')}
              <ChevronRight size={14} className={cn("transition-transform", queueOpen && "rotate-90")} />
            </span>
            <span className="bg-psu-blue/10 text-psu-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {queue.length} {t('supervisorHK.pendingCount')}
            </span>
          </button>
          <AnimatePresence>
            {queueOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ListCard
                  items={queue}
                  emptyIcon={<CheckCircle2 size={48} className="mx-auto" />}
                  emptyLabel={t('supervisorHK.allClear')}
                  rowClassName={(s) => isNotReadyToWork(s) || s.wasApprovedBeforeEdit ? "bg-psu-rejected/5" : undefined}
                  onRowClick={setSelected}
                  desktopColumns={[
                    { header: t('common.time'), width: '90px', render: (s) => new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) },
                    { header: t('common.site'), width: '1fr', render: (s) => s.siteName },
                    { header: t('common.type'), width: '1.4fr', render: (s) => { const k = titleKeyFor(s); return k ? t(k) : s.type; } },
                    { header: t('common.person'), width: '1fr', render: (s) => s.userName },
                    {
                      header: t('common.status'), width: '170px', render: (s) => (
                        <div className="flex flex-col gap-1">
                          {isNotReadyToWork(s) && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected"><AlertTriangle size={10} /> {t('supervisorHK.notReadyFlag')}</span>
                          )}
                          {s.wasApprovedBeforeEdit && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected"><Pencil size={10} /> {t('ops.signoff.editedAfterApproval')}</span>
                          )}
                          {s.meta?.returned?.to === 'reviewer' && !s.meta.returned.resolved && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-warning"><CornerUpLeft size={10} /> {t('ops.chain.sentBackToReviewerChip', { name: s.meta.returned.name })}</span>
                          )}
                          <SignoffProgress submission={s} />
                        </div>
                      ),
                    },
                    { header: '', width: '32px', className: 'text-right', render: () => <ChevronRight size={16} className="text-psu-gray/20 inline-block" /> },
                  ]}
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
                          {/* The filer edited this AFTER it was already
                              approved once (see wasApprovedBeforeEdit's
                              comment in types.ts) — without this, a
                              reviewer has no way to tell this apart from
                              a first-time submission. */}
                          {s.wasApprovedBeforeEdit && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected bg-psu-rejected/10 px-2 py-0.5 rounded-full mt-1.5">
                              <Pencil size={10} /> {t('ops.signoff.editedAfterApproval')}
                            </span>
                          )}
                          {s.meta?.returned?.to === 'reviewer' && !s.meta.returned.resolved && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-warning bg-psu-warning/10 px-2 py-0.5 rounded-full mt-1.5">
                              <CornerUpLeft size={10} /> {t('ops.chain.sentBackToReviewerChip', { name: s.meta.returned.name })}
                            </span>
                          )}
                          <div className="mt-2"><SignoffProgress submission={s} /></div>
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
      )}

      {mode !== 'historyOnly' && returnedWaiting.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center justify-between px-2 text-[10px] font-black text-psu-warning uppercase tracking-[0.2em]">
            <span className="flex items-center gap-1.5"><CornerUpLeft size={14} /> {t('ops.chain.returnedSection')}</span>
            <span className="bg-psu-warning/10 px-3 py-1 rounded-full">{returnedWaiting.length}</span>
          </h3>
          <div className="card !p-0 overflow-hidden divide-y divide-psu-gray/5">
            {returnedWaiting.map(r => {
              const k = titleKeyFor(r);
              return (
                <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-psu-bg">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-psu-gray truncate">{k ? t(k) : r.type}</p>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                      {r.userName} · {r.siteName} · {new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-psu-warning mt-1 truncate">
                      {r.meta?.returned ? `${r.meta.returned.name}: ${r.meta.returned.note}` : r.rejectionReason}
                    </p>
                    <p className="text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mt-0.5 truncate">
                      {t('ops.chain.waitingOn', { name: r.status === 'PENDING' && r.meta?.returned?.toName ? r.meta.returned.toName : r.userName })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode !== 'queueOnly' && (
        mode === 'historyOnly' ? (
          <div className="space-y-3">
            {/* On desktop this is reached through Supervisor/Manager
                Portal's DesktopShell, which already shows "History" as
                the page title (same translation key) — this would just
                repeat it. */}
            <h2 className="text-xl font-bold tracking-tight text-psu-gray px-2 md:hidden">{t('ops.historySectionTitle')}</h2>
            <SubmissionHistoryList
              submissions={history}
              emptyIcon={<ClipboardList size={48} className="mx-auto" />}
              emptyLabel={t('common.noData')}
              renderRow={historyRenderRow}
            />
          </div>
        ) : (
          <>
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
                    renderRow={historyRenderRow}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )
      )}
      </div>

    </div>
  );
}
