import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PhotoCapture } from '../PhotoCapture';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';

export function HousekeeperPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, addSubmission, trainings, completeTraining, sites } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentSite = sites.find(s => s.id === currentUser?.site);
  const currentSiteName = currentSite?.name || currentUser?.site || '';
  const checklistDefs = [
    { id: '1', key: 'housekeeper.checklist.q1' },
    { id: '2', key: 'housekeeper.checklist.q2' },
    { id: '3', key: 'housekeeper.checklist.q3' },
    { id: '4', key: 'housekeeper.checklist.q4' },
  ];
  const [checklistState, setChecklistState] = useState(
    checklistDefs.map(d => ({ id: d.id, checked: false, photo: null as string | null }))
  );
  // Recompute the display question on every render so a language switch
  // mid-task updates the visible text without losing progress.
  const checklist = checklistState.map((s, idx) => ({ ...s, question: t(checklistDefs[idx].key) }));

  const myHistory = submissions.filter(s => s.userId === currentUser?.id);

  const handleToggle = (id: string) => {
    setChecklistState(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handlePhoto = (id: string, url: string) => {
    setChecklistState(prev => prev.map(item => item.id === id ? { ...item, photo: url } : item));
  };

  const handleSubmit = async () => {
    if (checklist.some(i => !i.checked)) {
      alert(t('housekeeper.completeAllFirst'));
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    
    addSubmission({
      userId: currentUser!.id,
      userName: currentUser!.name,
      role: currentUser!.role,
      siteId: currentUser!.site,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'HOUSEKEEPING',
      status: 'PENDING',
      items: checklist.map(i => ({ id: i.id, question: i.question, answer: i.checked, photoUrl: i.photo || undefined })),
      score: 100,
    });

    setChecklistState(prev => prev.map(i => ({ ...i, checked: false, photo: null })));
    setIsSubmitting(false);
    setActiveTab('HISTORY');
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'TASKS', icon: ClipboardList, label: t('housekeeper.tabTasks') },
          { id: 'HISTORY', icon: History, label: t('housekeeper.tabHistory') },
          { id: 'TRAINING', icon: GraduationCap, label: t('housekeeper.tabTraining') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-green text-white shadow-md shadow-psu-green/20" 
                : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'TASKS' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.today')}</h2>
              <div className="flex items-center gap-1 text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">
                <MapPin size={12} /> {currentSiteName}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map(item => (
                <div key={item.id} className="card group">
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={() => handleToggle(item.id)}
                      className={cn(
                        "mt-1 w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all shrink-0",
                        item.checked ? "bg-psu-green border-psu-green text-white" : "border-psu-gray/10"
                      )}
                    >
                      {item.checked && <CheckCircle2 size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold transition-all", item.checked ? "text-psu-gray/30 line-through" : "text-psu-gray")}>
                        {item.question}
                      </p>
                      
                      {!item.checked && (
                        <div className="mt-4">
                          <PhotoCapture onCapture={(url) => handlePhoto(item.id, url)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || checklist.some(i => !i.checked)}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                checklist.every(i => i.checked) ? "bg-psu-green shadow-psu-green/20" : "bg-psu-gray/20 cursor-not-allowed text-psu-gray/40"
              )}
            >
              {isSubmitting ? <Clock className="animate-spin" /> : <CheckCircle2 size={18} />}
              {isSubmitting ? t('housekeeper.submitting') : t('housekeeper.submitButton')}
            </button>
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.historyTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHistory.map(s => (
                <div key={s.id} className="card flex items-center justify-between group hover:border-psu-green/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" :
                      s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" :
                      "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? <CheckCircle2 size={24} /> :
                       s.status === 'REJECTED' ? <XCircle size={24} /> :
                       <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-psu-gray">{new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{s.type} • ID {s.id.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" :
                      s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" :
                      "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? t('common.approved') : s.status === 'REJECTED' ? t('common.rejected') : t('common.pending')}
                    </span>
                  </div>
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
          <motion.div
            key="training"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('housekeeper.trainingTitle')}</h2>
            <TrainingsTab 
              trainings={trainings} 
              userId={currentUser?.id || ''} 
              onComplete={(id) => completeTraining(currentUser?.id || '', id)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
