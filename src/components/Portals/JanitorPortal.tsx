import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { RestroomForm } from '../OpsLogs/RestroomForm';
import { DeepLinkJob, parseDeepLinkFromUrl } from '../../lib/deepLink';
import { ScanJobButton } from '../QrScanner';
import { ReportIssueButton } from '../FieldReports/ReportIssueButton';
import { MyFieldReports } from '../FieldReports/MyFieldReports';
import { MyActionItems } from '../CorrectiveActions/MyActionItems';
import { PortalHeaderRow } from '../OpsLogs/opsHelpers';
import { SubmissionHistoryList } from '../SubmissionHistoryList';

interface JanitorPortalProps {
  store: ReturnType<typeof useAppStore>;
  // Scan-to-Job (deepLink.ts): true when a "toilet" job QR is what got
  // this Janitor here — the QR carries no site (see deepLink.ts's file
  // header), so there's nothing to block on; onDeepLinkHandled just clears
  // the pending job once it's actually been submitted.
  fromQr?: boolean;
  onDeepLinkHandled?: () => void;
  onScanJob?: (job: DeepLinkJob) => void;
}

// Split out of HousekeeperPortal.tsx's old 3-card picker — Bathroom
// Janitor now gets their own portal with just one job: the toilet
// cleaning checklist (UN.00.45). No site chip up here — RestroomForm's
// own OpsHeaderChip already shows (and, once this person has Site Access
// to more than one site, lets them pick) the site.
export function JanitorPortal({ store, fromQr, onDeepLinkHandled, onScanJob }: JanitorPortalProps) {
  const { t } = useTranslation();
  const { currentUser, submissions, trainings, completeTraining, sites } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const myHistory = submissions.filter(s => s.userId === currentUser?.id);
  const cameFromQr = Boolean(fromQr);
  // Report an Issue (types.ts's FieldReport) doesn't have its own site
  // picker like RestroomForm does — Home Site is close enough for a
  // free-form "something's broken" note, and keeps this from needing a
  // second, independently-drifting useWorkingSite instance up here (see
  // this file's own comment above on why there's no site chip at all).
  const reportSiteId = currentUser?.site || '';
  const reportSiteName = sites.find(s => s.id === reportSiteId)?.name || reportSiteId;

  const handleScanned = (rawValue: string) => {
    const job = parseDeepLinkFromUrl(rawValue);
    if (job) onScanJob?.(job);
  };

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
            <PortalHeaderRow
              title={t('ops.restroom.title')}
              controls={<>
                <ReportIssueButton store={store} siteId={reportSiteId} siteName={reportSiteName} department="HOUSEKEEPING" />
                <ScanJobButton
                  onScanned={handleScanned}
                  label={t('housekeeper.scanJobButton')}
                  iconOnly
                  className="w-9 h-9 rounded-xl bg-white border border-psu-gray/10 text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all shrink-0"
                />
              </>}
            />
            <RestroomForm
              store={store}
              onSubmitted={() => { setActiveTab('HISTORY'); if (cameFromQr) onDeepLinkHandled?.(); }}
            />
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.historyTitle')}</h2>
            <SubmissionHistoryList
              submissions={myHistory}
              emptyIcon={<ClipboardList size={48} className="mx-auto" />}
              emptyLabel={t('common.noData')}
              renderRow={(s) => (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? <CheckCircle2 size={20} /> : s.status === 'REJECTED' ? <XCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">ID {s.id.slice(-6)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0 ml-2",
                    s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" : s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" : "bg-psu-blue/10 text-psu-blue"
                  )}>
                    {s.status === 'APPROVED' ? t('common.approved') : s.status === 'REJECTED' ? t('common.rejected') : t('common.pending')}
                  </span>
                </div>
              )}
            />
            <MyFieldReports store={store} />
            <MyActionItems store={store} />
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
