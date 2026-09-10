import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, XCircle, Send, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { PhotoCapture } from '../PhotoCapture';

interface ReportIssueButtonProps {
  store: ReturnType<typeof useAppStore>;
  // Whatever site this person's screen is currently working at (each
  // frontline portal already resolves this — via hooks/useWorkingSite.ts
  // or, for Housekeeper, the barak/room picker) — the report is filed
  // against that site, not necessarily their Home Site.
  siteId: string;
  siteName: string;
  department: 'HOUSEKEEPING' | 'FOOD_SAFETY';
  className?: string;
}

// A free-form "something's broken" note any frontline worker can send to
// their supervisor at any time — separate from the checklist forms
// entirely (see types.ts's FieldReport). Deliberately lightweight: one
// textarea, one optional photo, no categories or severities to pick.
export function ReportIssueButton({ store, siteId, siteName, department, className }: ReportIssueButtonProps) {
  const { t } = useTranslation();
  const { currentUser, addFieldReport } = store;
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const reset = () => {
    setMessage('');
    setPhoto(null);
    setError('');
    setJustSent(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(t('fieldReport.errorEmpty'));
      return;
    }
    if (!currentUser) return;
    setIsSubmitting(true);
    addFieldReport({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId,
      siteName,
      department,
      timestamp: new Date().toISOString(),
      message: message.trim(),
      photoUrl: photo || undefined,
    });
    setIsSubmitting(false);
    setJustSent(true);
    setTimeout(handleClose, 1200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('fieldReport.reportButton')}
        className={className || "w-9 h-9 rounded-xl bg-white border border-psu-gray/10 text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all shrink-0"}
      >
        <Wrench size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 overflow-y-auto space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('fieldReport.title')}</h3>
                    <p className="text-xs text-psu-gray/50 font-medium mt-1 leading-relaxed max-w-[220px]">{t('fieldReport.subtitle')}</p>
                  </div>
                  <button onClick={handleClose} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors shrink-0">
                    <XCircle size={24} />
                  </button>
                </div>

                {justSent ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-psu-green">
                    <Send size={32} />
                    <p className="text-sm font-black uppercase tracking-widest">{t('fieldReport.submitButton')}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('fieldReport.messageLabel')}</label>
                      <textarea
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setError(''); }}
                        placeholder={t('fieldReport.messagePlaceholder')}
                        rows={4}
                        className={`w-full p-4 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 transition-all ${error ? 'border-psu-rejected' : 'border-psu-gray/10'}`}
                      />
                      {error && <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{error}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('fieldReport.photoLabel')}</label>
                      <PhotoCapture uid={currentUser?.id} onCapture={setPhoto} />
                    </div>
                  </>
                )}
              </div>

              {!justSent && (
                <div className="p-8 pt-0">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-psu-warning text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-warning/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
                    {isSubmitting ? t('fieldReport.submitting') : t('fieldReport.submitButton')}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
