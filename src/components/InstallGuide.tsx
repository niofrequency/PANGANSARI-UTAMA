import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Monitor, Apple, Check } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { cn } from '../utils/cn';

type DeviceTab = 'android' | 'ios' | 'desktop';

function detectDevice(): DeviceTab {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

interface InstallGuideProps {
  open: boolean;
  onClose: () => void;
}

export function InstallGuide({ open, onClose }: InstallGuideProps) {
  const { t, tList } = useTranslation();
  const [tab, setTab] = useState<DeviceTab>('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setTab(detectDevice());
  }, [open]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const tabs: { id: DeviceTab; label: string; icon: React.ElementType }[] = [
    { id: 'android', label: t('install.android'), icon: Smartphone },
    { id: 'ios', label: t('install.iphone'), icon: Apple },
    { id: 'desktop', label: t('install.desktop'), icon: Monitor },
  ];

  const stepsByTab: Record<DeviceTab, string[]> = {
    android: tList('install.androidSteps'),
    ios: tList('install.iosSteps'),
    desktop: tList('install.desktopSteps'),
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-psu-gray/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-psu-green/10 rounded-2xl flex items-center justify-center text-psu-green shrink-0">
                    <Download size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-psu-gray">{t('install.title')}</h3>
                  </div>
                </div>
                <button onClick={onClose} className="p-1 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                  <X size={22} />
                </button>
              </div>

              <p className="text-xs text-psu-gray/60 font-medium mb-6">{t('install.subtitle')}</p>

              <div className="flex bg-psu-bg rounded-2xl p-1.5 mb-6">
                {tabs.map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => setTab(tabItem.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all',
                      tab === tabItem.id ? 'bg-white text-psu-green shadow-sm' : 'text-psu-gray/40'
                    )}
                  >
                    <tabItem.icon size={16} />
                    {tabItem.label}
                  </button>
                ))}
              </div>

              <ol className="space-y-3">
                {stepsByTab[tab].map((step, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-psu-green/10 text-psu-green text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-psu-gray font-medium leading-snug">{step}</span>
                  </li>
                ))}
              </ol>

              {tab === 'android' && deferredPrompt && (
                <p className="text-[11px] text-psu-gray/40 font-medium mt-4">{t('install.androidAutoNote')}</p>
              )}
            </div>

            <div className="p-6 bg-psu-bg/30 border-t border-psu-gray/5 flex gap-3">
              {tab === 'android' && deferredPrompt ? (
                <button
                  onClick={handleNativeInstall}
                  className="flex-1 py-4 bg-psu-green text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  {t('install.installNow')}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-psu-green text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  {t('install.gotIt')}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
