import { useState, ComponentType } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, ChevronRight, CheckCircle2, XCircle, Clock, Stamp } from 'lucide-react';
import { Submission, OpsLogType } from '../../types';
import { OPS_LOG_DEFS, OpsDepartment } from '../../data/opsLogsCatalog';
import { SignoffProgress, nextSignoffStep } from './opsHelpers';
import { MessHallHygieneForm } from './MessHallHygieneForm';
import { CookingServiceForm } from './CookingServiceForm';
import { HotPackedMealForm } from './HotPackedMealForm';
import { ThawingForm } from './ThawingForm';
import { StaffReadyForm } from './StaffReadyForm';
import { LaundryShopForm } from './LaundryShopForm';
import { RestroomForm } from './RestroomForm';

const FORM_COMPONENTS: Record<OpsLogType, ComponentType<{ store: ReturnType<typeof useAppStore>; onCancel: () => void; onSubmitted: () => void }>> = {
  MESS_HALL_HYGIENE: MessHallHygieneForm,
  COOKING_SERVICE: CookingServiceForm,
  HOT_PACKED_MEAL: HotPackedMealForm,
  THAWING: ThawingForm,
  STAFF_READY: StaffReadyForm,
  LAUNDRY_SHOP: LaundryShopForm,
  RESTROOM: RestroomForm,
};

// Shared "Ops Logs" screen for the nine additional operations checklists
// (PSU_Additional_Ops_Forms_PRD.md) — used by both Supervisor portals (fill
// + stamp the first review step) and both Manager portals / GM (stamp the
// later approve/verify steps). Deliberately not folded into the Inspections
// tab next to GEMBA/FSI/DFH (PRD section 5) — those are audits, these are
// daily operations logs with their own paper sign-off chains.
export function OpsLogsTab({
  store, department, tier, unscoped = false,
}: {
  store: ReturnType<typeof useAppStore>;
  department: OpsDepartment;
  tier: 'supervisor' | 'manager';
  unscoped?: boolean; // GENERAL_MANAGER — no site filter, matches Escalations/Dashboard/Inspections
}) {
  const { t, language } = useTranslation();
  const { currentUser, submissions, sites, addSignoffStamp } = store;
  const [openType, setOpenType] = useState<OpsLogType | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const defs = OPS_LOG_DEFS.filter(d => d.department === department);
  const fillableDefs = tier === 'supervisor'
    ? defs.filter(d => currentUser && d.fillerRoles.includes(currentUser.role as any))
    : [];

  const deptTypes = defs.map(d => d.type);
  const inScope = (s: Submission) => deptTypes.includes(s.type as OpsLogType) && (unscoped || s.siteId === currentUser?.site);

  // "Needs your stamp": PENDING items whose next required step matches
  // this tier — checkedBy for a Supervisor's queue, approvedBy/verifiedBy
  // for a Manager's. A form whose chain skips straight to approvedBy
  // (e.g. STAFF_READY) never shows up in the Supervisor's queue at all.
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

  if (openType) {
    const FormComponent = FORM_COMPONENTS[openType];
    return <FormComponent store={store} onCancel={() => setOpenType(null)} onSubmitted={() => setOpenType(null)} />;
  }

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queue.map(s => {
            const def = defs.find(d => d.type === s.type);
            return (
              <div key={s.id} onClick={() => setSelected(s)} className="card cursor-pointer hover:border-psu-blue/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-psu-gray truncate">{def ? t(def.titleKey) : s.type}</h4>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                      {s.userName} · {s.siteName} · {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
                </div>
                <SignoffProgress submission={s} />
              </div>
            );
          })}
          {queue.length === 0 && (
            <div className="col-span-full text-center py-14 opacity-20">
              <CheckCircle2 size={48} className="mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('supervisorHK.allClear')}</p>
            </div>
          )}
        </div>
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
            {history.map(s => {
              const def = defs.find(d => d.type === s.type);
              return (
                <div key={s.id} onClick={() => setSelected(s)} className="card flex items-center justify-between cursor-pointer group hover:border-psu-blue/20 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue")}>
                      {s.status === 'APPROVED' ? <CheckCircle2 size={20} /> : s.status === 'REJECTED' ? <XCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{def ? t(def.titleKey) : s.type}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                        {s.userName} · {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-psu-gray/20 shrink-0" />
                </div>
              );
            })}
            {history.length === 0 && <p className="text-center text-xs text-psu-gray/30 font-bold py-6">{t('common.noData')}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{defs.find(d => d.type === selected.type) ? t(defs.find(d => d.type === selected.type)!.titleKey) : selected.type}</h3>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">{selected.userName} · {selected.siteName}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors"><XCircle size={22} /></button>
                </div>

                <div className="mb-5"><SignoffProgress submission={selected} /></div>

                <div className="space-y-3">
                  {selected.items.map((item, idx) => (
                    <div key={idx} className="bg-psu-bg border border-psu-gray/10 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-psu-gray">{item.question}</p>
                      {item.answer !== '' && <p className="text-xs text-psu-gray/60 mt-1">{String(item.answer)}</p>}
                      {item.remarks && <p className="text-[10px] text-psu-gray/40 mt-1 italic">{item.remarks}</p>}
                      {item.photoUrl && <img src={item.photoUrl} className="w-full h-32 object-cover rounded-xl mt-2" alt="" />}
                    </div>
                  ))}
                </div>
              </div>

              {nextSignoffStep(selected) && (tier === 'supervisor' ? nextSignoffStep(selected) === 'checkedBy' : true) && (
                <div className="p-6 bg-psu-bg/30 border-t border-psu-gray/5">
                  <button onClick={() => handleStamp(selected)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                  >
                    <Stamp size={16} /> {t('ops.stampButton')} — {t(`ops.signoff.${nextSignoffStep(selected)}`)}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
