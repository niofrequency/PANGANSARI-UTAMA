import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AlertTriangle, ClipboardCheck, ListChecks, ListTodo, MessageSquareWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { InspectionsTab } from '../Inspections/InspectionsTab';
import { OpsLogsTab } from '../OpsLogs/OpsLogsTab';
import { FieldReportsTab } from '../FieldReports/FieldReportsTab';
import { CorrectiveActionsTab } from '../CorrectiveActions/CorrectiveActionsTab';

interface SupervisorPortalProps {
  store: ReturnType<typeof useAppStore>;
  // Scan-to-Job (deepLink.ts): a Food Safety Supervisor's "ops_logs" QR
  // just needs to land them on the Ops Logs tab — see PSU_QR_JobDeepLink_
  // PRD.md's Users table. The QR carries no site (see deepLink.ts's file
  // header), so there's nothing to block on; onDeepLinkHandled clears the
  // pending job once they've landed (there's no single form submit to
  // wait for — the whole tab is the destination).
  startTab?: 'OPS_LOGS';
  onDeepLinkHandled?: () => void;
}

// The daily Housekeeping/Food Safety Field Queue used to live here as its
// own tab with a single Approve/Reject action, separate from Ops Logs'
// named sign-off chains. It's been merged into Ops Logs (see
// OpsLogsTab.tsx / opsLogsCatalog.ts's SIGNOFF_CHAINS): every submission
// now goes through a chain — some are just one step long — with the same
// Stamp/Reject actions in one place, instead of two different review
// screens for what a Supervisor experiences as the same job.
export function SupervisorPortal({ store, startTab, onDeepLinkHandled }: SupervisorPortalProps) {
  const { t } = useTranslation();
  const { currentUser, addWarning, users } = store;
  const isFoodSafety = currentUser?.role === 'FOOD_SAFETY_SUPERVISOR';
  const [activeTab, setActiveTab] = useState<'OPS_LOGS' | 'REPORTS' | 'ACTIONS' | 'INSPECTIONS'>(startTab ?? 'OPS_LOGS');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningData, setWarningData] = useState({ userId: '', reason: '', severity: 'LOW' as any });

  // A QR only ever gets someone to the right tab — once they're here, the
  // job is done. There's no discrete submit event to wait for, unlike the
  // Technician's fridge/core entries.
  useEffect(() => {
    if (startTab === 'OPS_LOGS') {
      setActiveTab('OPS_LOGS');
      onDeepLinkHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTab]);

  const handleIssueWarning = () => {
    // .trim() matters here specifically because this reason becomes a
    // permanent mark on someone's record.
    if (!warningData.userId || !warningData.reason.trim()) return;
    const tech = users.find(u => u.id === warningData.userId);
    addWarning({
      technicianId: warningData.userId,
      technicianName: tech?.name || 'Unknown',
      supervisorId: currentUser!.id,
      reason: warningData.reason.trim(),
      severity: warningData.severity,
      timestamp: new Date().toISOString()
    });
    setShowWarningDialog(false);
    setWarningData({ userId: '', reason: '', severity: 'LOW' });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'OPS_LOGS' as const, icon: ListChecks, label: t('ops.tabTitle') },
          { id: 'REPORTS' as const, icon: MessageSquareWarning, label: t('fieldReport.tabTitle') },
          { id: 'ACTIONS' as const, icon: ListTodo, label: t('correctiveAction.tabTitle') },
          // Housekeeping Supervisor gets this too now, restricted to
          // Gemba Walk's Section A only — see InspectionsTab.tsx.
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

      {activeTab === 'INSPECTIONS' && (
        <InspectionsTab store={store} department={isFoodSafety ? 'FOOD_SAFETY' : 'HOUSEKEEPING'} />
      )}

      {activeTab === 'OPS_LOGS' && (
        <OpsLogsTab store={store} department={isFoodSafety ? 'FOOD_SAFETY' : 'HOUSEKEEPING'} tier="supervisor" />
      )}

      {activeTab === 'REPORTS' && (
        <FieldReportsTab store={store} department={isFoodSafety ? 'FOOD_SAFETY' : 'HOUSEKEEPING'} />
      )}

      {activeTab === 'ACTIONS' && (
        <CorrectiveActionsTab store={store} department={isFoodSafety ? 'FOOD_SAFETY' : 'HOUSEKEEPING'} />
      )}

      {/* Not tied to any one tab — a Food Safety Supervisor can flag a
          Technician's pattern of bad behavior any time, independent of
          reviewing today's submissions. */}
      {isFoodSafety && (
        <button
          onClick={() => setShowWarningDialog(true)}
          className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-psu-warning/30 text-psu-warning rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-psu-warning/5 transition-all"
        >
          <AlertTriangle size={18} />
          {t('supervisorHK.issueWarning')}
        </button>
      )}

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
                    {/* Per the brief, only a Food Safety Supervisor warns, and only a technician — this dialog only renders for isFoodSafety, so this list is Food Safety Technicians alone, not Housekeepers. */}
                    {users.filter(u => u.role === 'FOOD_SAFETY_TECHNICIAN').map(u => (
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
                    disabled={!warningData.userId || !warningData.reason.trim()}
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
