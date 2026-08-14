import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsDashboard } from '../Dashboard/AnalyticsDashboard';
import { LayoutDashboard, CheckSquare, Settings, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';

export function ManagerPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { submissions, warnings, sites, updateSubmissionStatus } = store;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESCALATIONS'>('DASHBOARD');

  const escalations = submissions.filter(s => s.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'DASHBOARD', icon: LayoutDashboard, label: t('manager.tabAnalytics') },
          { id: 'ESCALATIONS', icon: CheckSquare, label: t('manager.tabEscalations') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-gray text-white shadow-md shadow-psu-gray/20" 
                : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('manager.dashboardTitle')}</h2>
              <button className="w-10 h-10 flex items-center justify-center text-psu-gray/30 bg-white rounded-xl border border-psu-gray/5 shadow-sm">
                <Settings size={18} />
              </button>
            </div>
            <AnalyticsDashboard submissions={submissions} warnings={warnings} sites={sites} />
          </motion.div>
        )}

        {activeTab === 'ESCALATIONS' && (
          <motion.div
            key="escalations"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray px-2">{t('manager.escalationsTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {escalations.map(s => (
                <div key={s.id} className="card group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center">
                        <User size={22} className="text-psu-gray/20" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-psu-gray">{s.userName}</h4>
                        <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{s.siteName}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-psu-blue bg-psu-blue/10 px-2 py-1 rounded uppercase tracking-tighter">{t('common.pending')}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => updateSubmissionStatus(s.id, 'REJECTED', 'Manager Override')}
                      className="flex-1 py-4 text-psu-rejected border-2 border-psu-rejected/10 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      {t('manager.deny')}
                    </button>
                    <button 
                      onClick={() => updateSubmissionStatus(s.id, 'APPROVED')}
                      className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                    >
                      {t('manager.approveArchive')}
                    </button>
                  </div>
                </div>
              ))}
              {escalations.length === 0 && (
                <div className="text-center py-20 opacity-30">
                  <CheckCircle2 size={48} className="mx-auto mb-2 text-psu-green" />
                  <p className="text-xs font-black uppercase tracking-widest text-psu-gray">{t('manager.allClear')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
