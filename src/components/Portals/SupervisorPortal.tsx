import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2, XCircle, Clock, Eye, AlertTriangle, User, MapPin, ClipboardCheck, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { Submission } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { InspectionsTab } from '../Inspections/InspectionsTab';

export function SupervisorPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, updateSubmissionStatus, addWarning, users } = store;
  const isFoodSafety = currentUser?.role === 'FOOD_SAFETY_SUPERVISOR';
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'INSPECTIONS'>('QUEUE');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningData, setWarningData] = useState({ userId: '', reason: '', severity: 'LOW' as any });

  const pending = submissions.filter(s => s.status === 'PENDING' && s.siteId === currentUser?.site);

  const handleApprove = (id: string) => {
    updateSubmissionStatus(id, 'APPROVED');
    setSelectedSubmission(null);
  };

  const handleReject = (id: string) => {
    if (!rejectionReason) {
      alert(t('supervisorHK.rejectionRequired'));
      return;
    }
    updateSubmissionStatus(id, 'REJECTED', rejectionReason);
    setSelectedSubmission(null);
    setRejectionReason('');
  };

  const handleIssueWarning = () => {
    if (!warningData.userId || !warningData.reason) return;
    const tech = users.find(u => u.id === warningData.userId);
    addWarning({
      technicianId: warningData.userId,
      technicianName: tech?.name || 'Unknown',
      supervisorId: currentUser!.id,
      reason: warningData.reason,
      severity: warningData.severity,
      timestamp: new Date().toISOString()
    });
    setShowWarningDialog(false);
    setWarningData({ userId: '', reason: '', severity: 'LOW' });
  };

  return (
    <div className="space-y-6">
      {isFoodSafety && (
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
          {[
            { id: 'QUEUE' as const, icon: ListChecks, label: t('supervisorHK.queueTitle') },
            { id: 'INSPECTIONS' as const, icon: ClipboardCheck, label: t('inspection.tabTitle') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
      )}

      {isFoodSafety && activeTab === 'INSPECTIONS' && <InspectionsTab store={store} />}

      {(!isFoodSafety || activeTab === 'QUEUE') && (
      <>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('supervisorHK.queueTitle')}</h2>
        <div className="bg-psu-blue/10 text-psu-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          {pending.length} {t('supervisorHK.pendingCount')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pending.map(s => (
          <motion.div 
            key={s.id}
            layoutId={s.id}
            onClick={() => setSelectedSubmission(s)}
            className="card flex items-center justify-between active:scale-98 transition-all cursor-pointer group hover:border-psu-blue/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20">
                <User size={28} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-psu-gray">{s.userName}</h4>
                <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{s.type} • {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-psu-blue/10 text-psu-blue flex items-center justify-center group-hover:bg-psu-blue group-hover:text-white transition-all">
              <Eye size={18} />
            </div>
          </motion.div>
        ))}

        {pending.length === 0 && (
          <div className="text-center py-16 opacity-20">
            <CheckCircle2 size={56} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('supervisorHK.allClear')}</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowWarningDialog(true)}
        className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-psu-warning/30 text-psu-warning rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-psu-warning/5 transition-all"
      >
        <AlertTriangle size={18} />
        {t('supervisorHK.issueWarning')}
      </button>
      </>
      )}

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('supervisorHK.verifyTitle')}</h3>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">{t('supervisorHK.entryId')}{selectedSubmission.id.slice(-6)}</p>
                  </div>
                  <button onClick={() => setSelectedSubmission(null)} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-psu-bg p-5 rounded-2xl border border-psu-gray/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <User className="text-psu-blue" size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('supervisorHK.fieldPersonnel')}</p>
                      <p className="text-sm font-bold text-psu-gray">{selectedSubmission.userName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">{t('supervisorHK.checklistTitle')}</h4>
                    {selectedSubmission.items.map((item, idx) => (
                      <div key={idx} className="bg-white border border-psu-gray/10 p-4 rounded-2xl">
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-xs font-bold text-psu-gray leading-relaxed">{item.question}</p>
                          <span className={cn(
                            "text-[9px] font-black px-2 py-1 rounded-md shrink-0",
                            item.answer === true ? "bg-psu-green/10 text-psu-green" : "bg-psu-blue/10 text-psu-blue"
                          )}>
                            {item.answer === true ? t('supervisorHK.pass') : item.answer === false ? t('supervisorHK.fail') : item.answer}
                          </span>
                        </div>
                        {item.photoUrl && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-psu-gray/5">
                            <img src={item.photoUrl} className="w-full h-40 object-cover" alt="Proof" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] mb-3">{t('supervisorHK.notesLabel')}</label>
                    <textarea 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t('supervisorHK.notesPlaceholder')}
                      className="w-full p-5 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 h-28"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-psu-bg/30 border-t border-psu-gray/5 flex gap-4">
                <button 
                  onClick={() => handleReject(selectedSubmission.id)}
                  className="flex-1 py-4 bg-white border-2 border-psu-rejected text-psu-rejected rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                >
                  {t('common.reject')}
                </button>
                <button 
                  onClick={() => handleApprove(selectedSubmission.id)}
                  className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                >
                  {t('common.approve')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warning Dialog */}
      <AnimatePresence>
        {showWarningDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-black text-psu-gray mb-4 flex items-center gap-2">
                <AlertTriangle className="text-psu-warning" size={20} />
                {t('supervisorHK.warningDialogTitle')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('supervisorHK.selectPerson')}</label>
                  <select 
                    value={warningData.userId}
                    onChange={(e) => setWarningData(p => ({ ...p, userId: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    <option value="">{t('supervisorHK.choosePerson')}</option>
                    {users.filter(u => u.role.includes('TECHNICIAN') || u.role.includes('HOUSEKEEPER')).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('supervisorHK.severity')}</label>
                  <div className="flex gap-2">
                    {[
                      { level: 'LOW', label: t('supervisorHK.severityLow') },
                      { level: 'MEDIUM', label: t('supervisorHK.severityMedium') },
                      { level: 'HIGH', label: t('supervisorHK.severityHigh') },
                    ].map(({ level, label }) => (
                      <button 
                        key={level}
                        onClick={() => setWarningData(p => ({ ...p, severity: level as any }))}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                          warningData.severity === level ? "bg-psu-warning text-white" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('supervisorHK.reasonLabel')}</label>
                  <textarea 
                    value={warningData.reason}
                    onChange={(e) => setWarningData(p => ({ ...p, reason: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20"
                    placeholder={t('supervisorHK.reasonPlaceholder')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowWarningDialog(false)} className="flex-1 py-3 text-slate-400 font-bold text-xs">{t('common.cancel')}</button>
                  <button 
                    onClick={handleIssueWarning}
                    disabled={!warningData.userId || !warningData.reason}
                    className="flex-1 py-3 bg-psu-warning text-white rounded-xl font-black text-xs disabled:opacity-50"
                  >
                    {t('supervisorHK.issueWarning')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
