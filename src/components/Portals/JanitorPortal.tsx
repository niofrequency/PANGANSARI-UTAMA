import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { RestroomForm } from '../OpsLogs/RestroomForm';

// Split out of HousekeeperPortal.tsx's old 3-card picker — Bathroom
// Janitor now gets their own portal with just one job: the toilet
// cleaning checklist (UN.00.45). No Scan-to-Job here (only room doors
// carry a job QR). No site chip here either — RestroomForm's own
// OpsHeaderChip already shows (and, once this person has Site Access to
// more than one site, lets them pick) the site.
export function JanitorPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, trainings, completeTraining } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const myHistory = submissions.filter(s => s.userId === currentUser?.id);

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'TASKS' as const, icon: ClipboardList, label: t('housekeeper.tabTasks') },
          { id: 'HISTORY' as const, icon: History, label: t('housekeeper.tabHistory') },
          { id: 'TRAINING' as const, icon: GraduationCap, label: t('housekeeper.tabTraining') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-psu-green text-white shadow-md shadow-psu-green/20" : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'TASKS' && (
          <motion.div key="tasks" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-psu-gray truncate px-2">{t('ops.restroom.title')}</h2>
            <RestroomForm store={store} onSubmitted={() => setActiveTab('HISTORY')} />
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.historyTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHistory.map(s => (
                <div key={s.id} className="card flex items-center justify-between group hover:border-psu-green/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? <CheckCircle2 size={24} /> : s.status === 'REJECTED' ? <XCircle size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-psu-gray">{new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">ID {s.id.slice(-6)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md",
                    s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue"
                  )}>
                    {s.status === 'APPROVED' ? t('common.approved') : s.status === 'REJECTED' ? t('common.rejected') : t('common.pending')}
                  </span>
                </div>
              ))}
              {myHistory.length === 0 && (
                <div className="text-center py-10 opacity-40">
                  <ClipboardList size={48} className="mx-auto mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'TRAINING' && (
          <motion.div key="training" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('housekeeper.trainingTitle')}</h2>
            <TrainingsTab trainings={trainings} userId={currentUser?.id || ''} onComplete={(id) => completeTraining(currentUser?.id || '', id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
