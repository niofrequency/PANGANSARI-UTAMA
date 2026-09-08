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
  loginByStaffCode: (staffCode: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
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

// Scan-to-Job login screen (see deepLink.ts / PSU_QR_JobDeepLink_PRD.md):
// shown instead of the normal email/password Login whenever a job QR is
// pending and nobody's signed in yet. Staff ID is a short code, not an
// email; the PIN is entered on a big on-screen keypad rather than typed
// into a text field, since this is meant to work well with a wet or
// gloved thumb on a shared kiosk-style device.
export function StaffIdGate({ pendingJob, sites, loginByStaffCode, onSuccess, onSwitchToEmailLogin, onScanJob }: StaffIdGateProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [staffCode, setStaffCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const siteName = sites.find((s) => s.id === pendingJob.siteId)?.name || pendingJob.siteId;
  const jobLabel = t(ACTION_LABEL_KEY[pendingJob.action]);

  const errorMessage = (code?: string): string => {
    switch (code) {
      case 'unknown-id': return t('staffIdGate.errorUnknownId');
      case 'wrong-pin': return t('staffIdGate.errorWrongPin');
      case 'inactive': return t('staffIdGate.errorInactive');
      default: return t('staffIdGate.errorGeneric');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Tapping Log In (or the button being merely disabled) with an
    // incomplete form used to just do nothing visible at all — which reads
    // exactly like a broken button. Always give a reason instead of
    // silently refusing.
    if (!staffCode.trim()) {
      setError(t('staffIdGate.errorEnterStaffId'));
      return;
    }
    if (pin.length !== 4) {
      setError(t('staffIdGate.errorEnterPin'));
      return;
    }
    setIsSubmitting(true);
    setError('');
    const result = await loginByStaffCode(staffCode, pin);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      setPin('');
      return;
    }
    onSuccess();
  };

  // Auto-submit the moment a 4th digit is entered — a kiosk PIN pad
  // doesn't need a separate "Enter" step.
  useEffect(() => {
    if (pin.length === 4 && staffCode.trim()) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const pressDigit = (d: string) => {
    if (isSubmitting) return;
    setError('');
    setPin((p) => (p.length < 4 ? p + d : p));
  };
  const pressBackspace = () => {
    if (isSubmitting) return;
    setPin((p) => p.slice(0, -1));
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
        <input
          type="text"
          value={staffCode}
          onChange={(e) => {
            setError('');
            setStaffCode(e.target.value.toUpperCase().slice(0, 12));
          }}
          placeholder={t('staffIdGate.staffIdPlaceholder')}
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full text-center text-2xl font-black tracking-[0.3em] py-4 mb-6 bg-psu-bg border-2 border-psu-gray/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-psu-blue/30 focus:border-psu-blue/30 transition-all"
        />

        <div className="flex items-center justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={
                'w-4 h-4 rounded-full border-2 transition-all ' +
                (pin.length > i ? 'bg-psu-green border-psu-green' : 'border-psu-gray/20')
              }
            />
          ))}
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
