import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Plus, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import { Submission } from '../../types';
import { FoodSafetyInspectionForm } from './FoodSafetyInspectionForm';
import { InspectionReportView } from './InspectionReportView';

const CATEGORY_COLOR: Record<string, string> = {
  A: 'text-psu-green bg-psu-green/10',
  B: 'text-psu-blue bg-psu-blue/10',
  C: 'text-psu-warning bg-psu-warning/10',
  D: 'text-psu-rejected bg-psu-rejected/10',
};

// Shared by SupervisorPortal (FOOD_SAFETY_SUPERVISOR) and ManagerPortal
// (FOOD_SAFETY_MANAGER): the inspection is a self-contained audit record —
// there is no separate reviewer, so it's stored as APPROVED the moment the
// inspector submits it (mirrors how the paper form works: once filled in
// and scored, it *is* the record).
export function InspectionsTab({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, addSubmission, sites } = store;
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selected, setSelected] = useState<Submission | null>(null);
  const currentSite = sites.find(s => s.id === currentUser?.site);
  const currentSiteName = currentSite?.name || currentUser?.site || '';

  const myInspections = submissions
    .filter(s => s.type === 'FOOD_SAFETY_INSPECTION' && s.siteId === currentUser?.site)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (selected) {
    return <InspectionReportView submission={selected} onBack={() => setSelected(null)} />;
  }

  if (view === 'NEW') {
    return (
      <FoodSafetyInspectionForm
        inspectorName={currentUser?.name || ''}
        onCancel={() => setView('LIST')}
        onSubmit={(payload) => {
          addSubmission({
            ...payload,
            userId: currentUser!.id,
            userName: currentUser!.name,
            role: currentUser!.role,
            siteId: currentUser!.site,
            siteName: currentSiteName,
            timestamp: new Date().toISOString(),
            status: 'APPROVED',
          });
          setView('LIST');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('inspection.historyTitle')}</h2>
        <button
          onClick={() => setView('NEW')}
          className="flex items-center gap-2 bg-psu-blue text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all"
        >
          <Plus size={14} /> {t('inspection.newButton')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {myInspections.map(s => {
            const category = s.meta?.category || 'D';
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(s)}
                className="card flex items-center justify-between cursor-pointer group hover:border-psu-blue/20 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0", CATEGORY_COLOR[category])}>
                    {category}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-psu-gray truncate">{s.meta?.areaAudited || t('inspection.formTitle')}</h4>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
                      {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {Math.round(s.score || 0)}%
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-psu-gray/20 group-hover:text-psu-blue transition-colors shrink-0" />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {myInspections.length === 0 && (
          <div className="col-span-full text-center py-16 opacity-20">
            <ClipboardList size={56} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('inspection.noInspectionsYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
