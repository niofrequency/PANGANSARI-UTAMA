import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle, Pencil, Trash2 } from 'lucide-react';
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
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

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
  // Reopening one of this Janitor's own History entries to edit and
  // resubmit — see the History tab's "Edit" button. Restarts the sign-off
  // chain from the Supervisor's step (resubmitAfterRejection in
  // useAppStore.ts), same as every other merged-in submission type.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingSubmission = editingId ? myHistory.find(s => s.id === editingId) : undefined;
  // "Type DELETE to confirm" fail-safe (ConfirmDeleteModal) in front of
  // permanently removing one of their own History entries — see
  // deleteSubmission in useAppStore.ts.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5 md:max-w-3xl md:mx-auto">
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
          <motion.div key="tasks" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-6 md:max-w-3xl md:mx-auto">
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
              editingSubmission={editingSubmission}
              onCancel={editingSubmission ? () => { setEditingId(null); setActiveTab('HISTORY'); } : undefined}
              onSubmitted={() => { setEditingId(null); setActiveTab('HISTORY'); if (cameFromQr) onDeepLinkHandled?.(); }}
            />
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 md:max-w-3xl md:mx-auto">
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.historyTitle')}</h2>
            <SubmissionHistoryList
              submissions={myHistory}
              emptyIcon={<ClipboardList size={48} className="mx-auto" />}
              emptyLabel={t('common.noData')}
              renderRow={(s) => (
                <div className="space-y-3">
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
                {/* Edit and Delete are both always available on the
                    filer's own entries, any status — not just REJECTED.
                    Editing restarts the sign-off chain (see
                    resubmitAfterRejection's comment in useAppStore.ts);
                    deleting is gated behind ConfirmDeleteModal's "type
                    DELETE" fail-safe. */}
                <div className="pt-3 border-t border-psu-gray/5 space-y-2">
                  {s.status === 'REJECTED' && s.rejectionReason && (
                    <p className="text-xs text-psu-gray/60 font-medium">{s.rejectionReason}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(s.id); setActiveTab('TASKS'); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-psu-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      <Pencil size={14} /> {t('ops.signoff.editAndResubmit')}
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(s.id)}
                      aria-label={t('confirmDelete.removeButton')}
                      className="px-4 py-3 bg-psu-rejected/10 text-psu-rejected rounded-xl active:scale-95 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                </div>
              )}
            />
            <MyFieldReports store={store} />
            <MyActionItems store={store} />
          </motion.div>
        )}

        {activeTab === 'TRAINING' && (
          <motion.div key="training" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="md:max-w-3xl md:mx-auto">
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('housekeeper.trainingTitle')}</h2>
            <TrainingsTab trainings={trainings} userId={currentUser?.id || ''} onComplete={(id) => completeTraining(currentUser?.id || '', id)} />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={Boolean(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) store.deleteSubmission(deleteTargetId);
          setDeleteTargetId(null);
        }}
      />
    </div>
  );
}
