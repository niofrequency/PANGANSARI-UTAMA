import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PhotoCapture } from '../PhotoCapture';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardCheck, History, GraduationCap, CheckCircle2, Clock, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';

export function TechnicianPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, addSubmission, trainings, completeTraining, warnings } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fridgeTemp: '4',
    cookingTemp: '75',
    areaClean: false,
    ppeWorn: false,
    photo: null as string | null
  });

  const myHistory = submissions.filter(s => s.userId === currentUser?.id);
  const myWarnings = warnings.filter(w => w.technicianId === currentUser?.id);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    
    addSubmission({
      userId: currentUser!.id,
      userName: currentUser!.name,
      role: currentUser!.role,
      siteId: currentUser!.site,
      siteName: 'Catering Facility A',
      timestamp: new Date().toISOString(),
      type: 'FOOD_SAFETY',
      status: 'PENDING',
      items: [
        { id: '1', question: t('technician.fridgeTemp'), answer: formData.fridgeTemp },
        { id: '2', question: t('technician.coreTemp'), answer: formData.cookingTemp },
        { id: '3', question: t('technician.areaClean'), answer: formData.areaClean },
        { id: '4', question: t('technician.ppeWorn'), answer: formData.ppeWorn },
      ],
      score: 100,
    });

    setFormData({ fridgeTemp: '4', cookingTemp: '75', areaClean: false, ppeWorn: false, photo: null });
    setIsSubmitting(false);
    setActiveTab('HISTORY');
  };

  return (
    <div className="space-y-6">
      {/* Warning Alert if any */}
      {myWarnings.length > 0 && (activeTab === 'TASKS') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-psu-warning/10 border-2 border-psu-warning/30 p-5 rounded-2xl flex gap-4 items-center shadow-lg shadow-psu-warning/5"
        >
          <AlertTriangle className="text-psu-warning shrink-0" size={28} />
          <div>
            <p className="text-sm font-black text-psu-warning uppercase tracking-widest">{t('common.warning')}</p>
            <p className="text-[11px] text-psu-gray/70 font-medium">{t('technician.warningAlert', { count: myWarnings.length })}</p>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'TASKS', icon: ClipboardCheck, label: t('technician.tabChecks') },
          { id: 'HISTORY', icon: History, label: t('technician.tabHistory') },
          { id: 'TRAINING', icon: GraduationCap, label: t('technician.tabTraining') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" 
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
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('technician.dailyLogTitle')}</h2>
              <div className="flex items-center gap-1 text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">
                <MapPin size={12} /> Kitchen B
              </div>
            </div>

            <div className="card space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('technician.fridgeTemp')}</label>
                  <input 
                    type="number" 
                    value={formData.fridgeTemp}
                    onChange={(e) => setFormData(p => ({ ...p, fridgeTemp: e.target.value }))}
                    className="w-full bg-psu-bg border border-psu-gray/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('technician.coreTemp')}</label>
                  <input 
                    type="number" 
                    value={formData.cookingTemp}
                    onChange={(e) => setFormData(p => ({ ...p, cookingTemp: e.target.value }))}
                    className="w-full bg-psu-bg border border-psu-gray/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'areaClean', label: t('technician.areaClean') },
                  { id: 'ppeWorn', label: t('technician.ppeWorn') },
                ].map(item => (
                  <label key={item.id} className="flex items-center justify-between p-4 bg-psu-bg/50 border border-psu-gray/5 rounded-2xl cursor-pointer hover:bg-psu-bg transition-colors">
                    <span className="text-sm font-bold text-psu-gray">{item.label}</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={(formData as any)[item.id]}
                        onChange={(e) => setFormData(p => ({ ...p, [item.id]: e.target.checked }))}
                      />
                      <div className="w-12 h-6 bg-psu-gray/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-psu-blue"></div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-3">{t('technician.photoLabel')}</label>
                <PhotoCapture onCapture={(url) => setFormData(p => ({ ...p, photo: url }))} />
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-psu-blue rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-psu-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Clock className="animate-spin" /> : <CheckCircle2 size={18} />}
                {isSubmitting ? t('technician.submitting') : t('technician.submitButton')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-black text-psu-gray">{t('technician.historyTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHistory.map(s => (
                <div key={s.id} className="card flex items-center justify-between group hover:border-psu-blue/20 transition-all">
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
            </div>
          </motion.div>
        )}

        {activeTab === 'TRAINING' && (
          <motion.div
            key="training"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('technician.trainingTitle')}</h2>
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
