import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n/LanguageContext';
import { InstallGuide } from './InstallGuide';

export function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const alreadyInstalled =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (!alreadyInstalled) {
      const dismissed = sessionStorage.getItem('psu_install_banner_dismissed');
      if (!dismissed) setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('psu_install_banner_dismissed', '1');
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-4 right-4 z-[90] bg-psu-gray text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <button
              onClick={() => setShowGuide(true)}
              className="w-10 h-10 bg-psu-green rounded-xl flex items-center justify-center shrink-0"
              aria-label={t('install.buttonLabel')}
            >
              <Download size={20} />
            </button>
            <button onClick={() => setShowGuide(true)} className="flex-1 text-left">
              <p className="text-xs font-black uppercase tracking-widest">{t('install.title')}</p>
              <p className="text-[10px] opacity-70">{t('install.subtitle')}</p>
            </button>
            <button onClick={dismiss} className="p-1 opacity-50" aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <InstallGuide open={showGuide} onClose={() => { setShowGuide(false); dismiss(); }} />
    </>
  );
}
