import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Plus, ChevronRight, ClipboardCheck, Footprints, Users, Pencil } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { Submission } from '../../types';
import { FoodSafetyInspectionForm } from './FoodSafetyInspectionForm';
import { InspectionReportView } from './InspectionReportView';
import { GembaWalkForm } from './GembaWalkForm';
import { GembaWalkReportView } from './GembaWalkReportView';
import { DailyFoodHandlerForm } from './DailyFoodHandlerForm';
import { DailyFoodHandlerReportView } from './DailyFoodHandlerReportView';
import { userCanSeeSite } from '../../lib/siteScope';
import { HOUSEKEEPING_GEMBA_ROLES } from '../../data/opsLogsCatalog';

type AuditType = 'FOOD_SAFETY_INSPECTION' | 'GEMBA_WALK' | 'DAILY_FOOD_HANDLER';

const CATEGORY_COLOR: Record<string, string> = {
  A: 'text-psu-green bg-psu-green/10',
  B: 'text-psu-blue bg-psu-blue/10',
  C: 'text-psu-warning bg-psu-warning/10',
  D: 'text-psu-rejected bg-psu-rejected/10',
};

function scoreColor(score?: number) {
  if (score === undefined) return 'text-psu-gray/50 bg-psu-gray/10';
  if (score >= 90) return 'text-psu-green bg-psu-green/10';
  if (score >= 75) return 'text-psu-blue bg-psu-blue/10';
  if (score >= 50) return 'text-psu-warning bg-psu-warning/10';
  return 'text-psu-rejected bg-psu-rejected/10';
}

// Shared by SupervisorPortal (both departments) and ManagerPortal
// (FOOD_SAFETY_MANAGER/GENERAL_MANAGER). Food Safety Inspection and Daily
// Food Handler are self-contained records — there's no separate reviewer,
// so each is stored as APPROVED the moment the inspector submits it
// (mirrors how the paper forms work: once filled in and scored, it *is*
// the record). Gemba Walk is the exception: it's stored PENDING and shows
// up in the Manager/Assistant Manager's Ops Logs review queue for
// approval (OpsLogsTab.tsx), same as a daily Housekeeping/Food Safety
// submission — and can come back REJECTED, fixed in place here, and
// resubmitted (see editingSubmission below).
export function InspectionsTab({ store, department }: { store: ReturnType<typeof useAppStore>; department: 'HOUSEKEEPING' | 'FOOD_SAFETY' }) {
  const { t } = useTranslation();
  const { currentUser, submissions, addSubmission, resubmitAfterRejection, sites } = store;
  const [view, setView] = useState<'LIST' | 'PICKER' | 'NEW_FSI' | 'NEW_GEMBA' | 'NEW_DFH'>('LIST');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const currentSite = sites.find(s => s.id === currentUser?.site);
  const currentSiteName = currentSite?.name || currentUser?.site || '';
  const gembaSections: ('A' | 'B')[] = department === 'HOUSEKEEPING' ? ['A'] : ['A', 'B'];

  // Site-scoped per lib/siteScope.ts — Home Site by default, 'ALL' for
  // GENERAL_MANAGER unless the Admin overrides it, or wider still if the
  // Admin gave this Supervisor/Manager a Site Access override. Gemba Walk
  // is also filtered by department (see HOUSEKEEPING_GEMBA_ROLES above) —
  // FSI and DFH need no such filter since only Food Safety roles can ever
  // create one.
  const myAudits = submissions
    .filter((s): s is Submission & { type: AuditType } =>
      (s.type === 'FOOD_SAFETY_INSPECTION' || s.type === 'GEMBA_WALK' || s.type === 'DAILY_FOOD_HANDLER')
      && userCanSeeSite(currentUser, s.siteId)
      && (s.type !== 'GEMBA_WALK' || HOUSEKEEPING_GEMBA_ROLES.includes(s.role) === (department === 'HOUSEKEEPING'))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Reopening a REJECTED Gemba Walk to fix and resubmit — see the "Fix &
  // Resubmit" button below. FSI/DFH never reach REJECTED (always instant
  // APPROVED — see this function's header comment), so this only ever
  // matters for Gemba Walk.
  const editingSubmission = editingId ? myAudits.find(s => s.id === editingId) : undefined;

  const commonSubmissionFields = (type: AuditType) => ({
    userId: currentUser!.id,
    userName: currentUser!.name,
    role: currentUser!.role,
    siteId: currentUser!.site,
    siteName: currentSiteName,
    timestamp: new Date().toISOString(),
    // A Gemba Walk needs Manager/Assistant Manager sign-off before it's
    // final; Food Safety Inspection and Daily Food Handler don't (see this
    // function's header comment).
    status: type === 'GEMBA_WALK' ? 'PENDING' as const : 'APPROVED' as const,
  });

  if (selected) {
    if (selected.type === 'GEMBA_WALK') return <GembaWalkReportView submission={selected} onBack={() => setSelected(null)} />;
    if (selected.type === 'DAILY_FOOD_HANDLER') return <DailyFoodHandlerReportView submission={selected} onBack={() => setSelected(null)} />;
    return <InspectionReportView submission={selected} onBack={() => setSelected(null)} />;
  }

  if (view === 'NEW_FSI') {
    return (
      <FoodSafetyInspectionForm
        inspectorName={currentUser?.name || ''}
        onCancel={() => setView('LIST')}
        onSubmit={(payload) => {
          addSubmission({ ...payload, ...commonSubmissionFields('FOOD_SAFETY_INSPECTION') });
          setView('LIST');
        }}
      />
    );
  }

  if (view === 'NEW_GEMBA') {
    return (
      <GembaWalkForm
        inspectorName={editingSubmission?.meta?.inspectorName || currentUser?.name || ''}
        sections={gembaSections}
        editingSubmission={editingSubmission}
        onCancel={() => { setView('LIST'); setEditingId(null); }}
        onSubmit={(payload) => {
          if (editingSubmission) {
            resubmitAfterRejection(editingSubmission.id, payload);
          } else {
            addSubmission({ ...payload, ...commonSubmissionFields('GEMBA_WALK') });
          }
          setView('LIST');
          setEditingId(null);
        }}
      />
    );
  }

  if (view === 'NEW_DFH') {
    return (
      <DailyFoodHandlerForm
        siteName={currentSiteName}
        onCancel={() => setView('LIST')}
        onSubmit={(payload) => {
          addSubmission({ ...payload, ...commonSubmissionFields('DAILY_FOOD_HANDLER') });
          setView('LIST');
        }}
      />
    );
  }

  if (view === 'PICKER') {
    const options: { view: 'NEW_FSI' | 'NEW_GEMBA' | 'NEW_DFH'; icon: typeof ClipboardCheck; color: string; title: string; desc: string }[] = [
      { view: 'NEW_FSI', icon: ClipboardCheck, color: 'bg-psu-blue/10 text-psu-blue', title: t('inspection.pickerFsi'), desc: t('inspection.pickerFsiDesc') },
      { view: 'NEW_GEMBA', icon: Footprints, color: 'bg-psu-green/10 text-psu-green', title: t('inspection.pickerGemba'), desc: t('inspection.pickerGembaDesc') },
      { view: 'NEW_DFH', icon: Users, color: 'bg-psu-warning/10 text-psu-warning', title: t('inspection.pickerDfh'), desc: t('inspection.pickerDfhDesc') },
    ];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('inspection.pickerTitle')}</h2>
            <p className="text-xs text-psu-gray/50 font-medium mt-0.5">{t('inspection.pickerSubtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map(opt => (
            <button key={opt.view} onClick={() => setView(opt.view)} className="card text-left flex items-start gap-4 hover:border-psu-blue/20 transition-all active:scale-98">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", opt.color)}>
                <opt.icon size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-psu-gray">{opt.title}</h4>
                <p className="text-xs text-psu-gray/50 font-medium mt-1">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setView('LIST')} className="w-full py-3 text-psu-gray/40 font-black text-xs uppercase tracking-widest">
          {t('inspection.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('inspection.historyTitle')}</h2>
        <button
          // Housekeeping only ever does Gemba Walk here — skip straight to
          // it instead of making them choose from a picker with one option.
          onClick={() => setView(department === 'HOUSEKEEPING' ? 'NEW_GEMBA' : 'PICKER')}
          className="flex items-center gap-2 bg-psu-blue text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all"
        >
          <Plus size={14} /> {t('inspection.newButton')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {myAudits.map(s => {
            const category = s.meta?.category || 'D';
            const icon = s.type === 'GEMBA_WALK' ? Footprints : s.type === 'DAILY_FOOD_HANDLER' ? Users : null;
            const typeLabel = s.type === 'GEMBA_WALK' ? t('inspection.pickerGemba') : s.type === 'DAILY_FOOD_HANDLER' ? t('inspection.pickerDfh') : t('inspection.pickerFsi');
            const defaultTitle = s.type === 'GEMBA_WALK' ? t('gemba.formTitle') : s.type === 'DAILY_FOOD_HANDLER' ? t('dfh.formTitle') : t('inspection.formTitle');
            const scoreText = s.score !== undefined ? `${Math.round(s.score)}%` : '—';
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card space-y-3 group hover:border-psu-blue/20 transition-all"
              >
                <div onClick={() => setSelected(s)} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0",
                      icon ? scoreColor(s.score) : CATEGORY_COLOR[category]
                    )}>
                      {icon ? (icon === Footprints ? <Footprints size={20} /> : <Users size={20} />) : category}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{s.meta?.areaAudited || defaultTitle}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
                        {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {scoreText} · {typeLabel}
                        {/* Site shown once this view can span more than one
                            site — GENERAL_MANAGER by default, or anyone the
                            Admin gave a Site Access override to. */}
                        {(currentUser?.role === 'GENERAL_MANAGER' || currentUser?.assignedSites) && s.siteName ? ` · ${s.siteName}` : ''}
                      </p>
                      {/* Only Gemba Walk goes through review — see this
                          file's header comment — so this is the one type
                          where a status badge is worth showing here. */}
                      {s.type === 'GEMBA_WALK' && s.status !== 'APPROVED' && (
                        <span className={cn(
                          "inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          s.status === 'REJECTED' ? "text-psu-rejected bg-psu-rejected/10" : "text-psu-warning bg-psu-warning/10"
                        )}>
                          {s.status === 'REJECTED' ? t('common.rejected') : t('common.pending')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-psu-gray/20 group-hover:text-psu-blue transition-colors shrink-0" />
                </div>
                {s.type === 'GEMBA_WALK' && s.status === 'REJECTED' && s.userId === currentUser?.id && (
                  <div className="pt-3 border-t border-psu-gray/5 space-y-2">
                    {s.rejectionReason && <p className="text-xs text-psu-gray/60 font-medium">{s.rejectionReason}</p>}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setView('NEW_GEMBA'); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-psu-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      <Pencil size={14} /> {t('ops.signoff.editAndResubmit')}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {myAudits.length === 0 && (
          <div className="col-span-full text-center py-16 opacity-20">
            <ClipboardList size={56} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('inspection.noInspectionsYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
