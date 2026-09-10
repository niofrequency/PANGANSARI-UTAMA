import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle, MapPinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { LaundryShopForm } from '../OpsLogs/LaundryShopForm';
import { DeepLinkJob, parseDeepLinkFromUrl } from '../../lib/deepLink';
import { userCanSeeSite } from '../../lib/siteScope';
import { ScanJobButton } from '../QrScanner';

interface LaundryStaffPortalProps {
  store: ReturnType<typeof useAppStore>;
  // Scan-to-Job (deepLink.ts): the site a "laundry" job QR was scanned at
  // (blocks the form if this Laundry Staff has no Site Access to it —
  // same "Lokasi salah" pattern as the other frontline portals), and a
  // callback to clear the pending job once it's actually been submitted.
  expectedSite?: string;
  onDeepLinkHandled?: () => void;
  onScanJob?: (job: DeepLinkJob) => void;
}

// Split out of HousekeeperPortal.tsx's old 3-card picker — Laundry Staff
// now gets their own portal with just one job: the laundry shop's daily
// receiving log. No site chip up here — LaundryShopForm's own
// OpsHeaderChip already shows (and, once this person has Site Access to
// more than one site, lets them pick) the site, so a second one up here
// would just drift out of sync with it.
export function LaundryStaffPortal({ store, expectedSite, onDeepLinkHandled, onScanJob }: LaundryStaffPortalProps) {
  const { t } = useTranslation();
  const { currentUser, submissions, trainings, completeTraining, sites } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const myHistory = submissions.filter(s => s.userId === currentUser?.id);
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';
  const cameFromQr = expectedSite !== undefined;
  const siteMismatch = Boolean(expectedSite && currentUser && !userCanSeeSite(currentUser, expectedSite));

  const handleScanned = (rawValue: string) => {
    const job = parseDeepLinkFromUrl(rawValue);
    if (job) onScanJob?.(job);
  };

  if (siteMismatch) {
    const scannedSiteName = sites.find(s => s.id === expectedSite)?.name || expectedSite;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-psu-rejected/10 rounded-2xl flex items-center justify-center text-psu-rejected mb-4">
          <MapPinOff size={28} />
        </div>
        <h2 className="text-lg font-bold text-psu-gray">{t('deepLink.wrongLocationTitle')}</h2>
        <p className="mt-2 text-sm text-psu-gray/60 max-w-xs">
          {t('deepLink.wrongLocationBody', { site: scannedSiteName || '', mySite: currentSiteName })}
        </p>
        <button
          onClick={() => onDeepLinkHandled?.()}
          className="mt-6 px-6 py-3 bg-psu-gray text-white rounded-2xl font-black text-[10px] uppercase tracking-widest"
        >
          {t('deepLink.continueToMyPortal')}
        </button>
      </div>
    );
  }

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
            <div className="flex items-center justify-between px-2 gap-3">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray truncate">{t('ops.laundryShop.title')}</h2>
              <ScanJobButton
                onScanned={handleScanned}
                label={t('housekeeper.scanJobButton')}
                iconOnly
                className="w-9 h-9 rounded-xl bg-white border border-psu-gray/10 text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all shrink-0"
              />
            </div>
            <LaundryShopForm
              store={store}
              onSubmitted={() => { setActiveTab('HISTORY'); if (cameFromQr) onDeepLinkHandled?.(); }}
            />
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
