import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, AlertCircle, LogIn } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { DeepLinkJob, parseDeepLinkFromUrl } from '../lib/deepLink';
import { Site } from '../types';
import { ScanJobButton } from './QrScanner';

interface StaffIdGateProps {
  pendingJob: DeepLinkJob;
  sites: Site[];
  loginByStaffCode: (staffCode: string) => Promise<{ ok: boolean; error?: string }>;
  onSuccess: () => void;
  onSwitchToEmailLogin: () => void;
  onScanJob: (job: DeepLinkJob) => void;
}

const ACTION_LABEL_KEY: Record<DeepLinkJob['action'], string> = {
  fridge: 'technician.fridgeTemp',
  core: 'technician.coreTemp',
  clean: 'technician.areaClean',
  wellness: 'technician.sectionPersonalCheck',
  room: 'housekeeper.tabTasks',
};

const MAX_STAFF_ID_LENGTH = 12;
const MIN_STAFF_ID_LENGTH = 3;

// Scan-to-Job login screen (see deepLink.ts / PSU_QR_JobDeepLink_PRD.md):
// shown instead of the normal email/password Login whenever a job QR is
// pending and nobody's signed in yet. Staff ID alone is the credential —
// no PIN — entered on an on-screen number pad rather than a text field,
// since IDs are digits only (see utils/staffCode.ts): nothing on this
// screen ever needs a letter keyboard, which matters on a shared,
// possibly wet- or gloved-thumb kiosk device.
export function StaffIdGate({ pendingJob, sites, loginByStaffCode, onSuccess, onSwitchToEmailLogin, onScanJob }: StaffIdGateProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [staffCode, setStaffCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const siteName = sites.find((s) => s.id === pendingJob.siteId)?.name || pendingJob.siteId;
  const jobLabel = t(ACTION_LABEL_KEY[pendingJob.action]);

  const errorMessage = (code?: string): string => {
    switch (code) {
      case 'unknown-id': return t('staffIdGate.errorUnknownId');
      case 'inactive': return t('staffIdGate.errorInactive');
      default: return t('staffIdGate.errorGeneric');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Always give a reason instead of silently refusing — a disabled
    // button with no feedback reads exactly like a broken one.
    if (staffCode.trim().length < MIN_STAFF_ID_LENGTH) {
      setError(t('staffIdGate.errorEnterStaffId'));
      return;
    }
    setIsSubmitting(true);
    setError('');
    const result = await loginByStaffCode(staffCode);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    onSuccess();
  };

  const pressDigit = (d: string) => {
    if (isSubmitting) return;
    setError('');
    setStaffCode((p) => (p.length < MAX_STAFF_ID_LENGTH ? p + d : p));
  };

  const pressBackspace = () => {
    if (isSubmitting) return;
    setStaffCode((p) => p.slice(0, -1));
  };

  const handleScanned = (rawValue: string) => {
    const job = parseDeepLinkFromUrl(rawValue);
    if (job) onScanJob(job);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F7F8F7]">
      <button
        onClick={toggleLanguage}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white shadow-sm border border-psu-gray/10 text-psu-gray text-[10px] font-black flex items-center justify-center uppercase"
        aria-label={t('languageToggle.label')}
      >
        {language === 'en' ? 'ID' : 'EN'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-psu-gray/5 p-8 border border-psu-gray/5"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/icons/psu-logo-full.png" alt="Pangansari Utama" className="h-14 w-auto mb-3" />
          <h1 className="text-lg font-bold tracking-tight text-psu-gray">{t('staffIdGate.title')}</h1>
          <p className="text-[11px] text-psu-blue font-bold mt-2 bg-psu-blue/5 rounded-full px-3 py-1.5">
            {jobLabel} · {siteName}
          </p>
        </div>

        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 text-center">
          {t('staffIdGate.staffIdLabel')}
        </label>
        <div
          className={
            "w-full min-h-[64px] flex items-center justify-center text-center text-3xl font-black tracking-[0.2em] py-3 mb-6 bg-psu-bg border-2 rounded-2xl transition-all " +
            (error ? "border-psu-rejected" : "border-psu-gray/10")
          }
        >
          {staffCode || <span className="text-psu-gray/20 text-lg tracking-normal">{t('staffIdGate.staffIdPlaceholder')}</span>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(d)}
              disabled={isSubmitting}
              className="h-14 rounded-2xl bg-psu-bg text-psu-gray text-xl font-black active:scale-95 transition-all disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => pressDigit('0')}
            disabled={isSubmitting}
            className="h-14 rounded-2xl bg-psu-bg text-psu-gray text-xl font-black active:scale-95 transition-all disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={pressBackspace}
            disabled={isSubmitting}
            className="h-14 rounded-2xl bg-psu-bg text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
            aria-label={t('staffIdGate.backspace')}
          >
            <Delete size={20} />
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-4 bg-red-50 text-psu-rejected text-xs rounded-xl border border-red-100 font-medium mb-4"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-psu-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
        >
          <LogIn size={18} />
          {isSubmitting ? t('common.loading') : t('staffIdGate.submitButton')}
        </button>

        <ScanJobButton
          onScanned={handleScanned}
          label={t('staffIdGate.scanJobButton')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-psu-gray/10 bg-white text-psu-gray font-bold text-xs active:scale-95 transition-all mb-4"
        />

        <button
          type="button"
          onClick={onSwitchToEmailLogin}
          className="w-full text-center text-[11px] text-psu-gray/40 font-bold underline"
        >
          {t('staffIdGate.switchToEmail')}
        </button>
      </motion.div>
    </div>
  );
}
