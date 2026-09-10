import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, MapPin, Download, AlertTriangle, Bell, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n/LanguageContext';
import { InstallGuide } from './InstallGuide';

// One rejected submission worth surfacing in the notification bell —
// deliberately just enough to explain what it is and why it came back,
// not a deep link into the exact tab/form (each portal manages its own
// tab state independently, so "go there for me" isn't addressable from
// here). See App.tsx for how this list is built.
export interface RejectedNotice {
  id: string;
  title: string;
  reason?: string;
}

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  // Set by useAppStore when a localStorage write just failed (almost
  // always because the browser's per-origin quota is full) — shown as a
  // persistent banner so it's not a silent failure, since the effect that
  // failed is the one that would have saved whatever was just submitted.
  storageError?: 'quota' | 'unknown' | null;
  // This person's own submissions currently sitting REJECTED, awaiting a
  // fix and resubmit (see useAppStore.ts's rejectSignoff/
  // resubmitAfterRejection). Empty or omitted hides the bell entirely.
  rejectedNotices?: RejectedNotice[];
}

export function Layout({ user, onLogout, children, storageError, rejectedNotices = [] }: LayoutProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showNotices, setShowNotices] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-psu-gray/10 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm/5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/icons/psu-mark.png" alt="PSU" className="h-8 w-auto shrink-0" />
          {/* min-w-0 + truncate (not whitespace-nowrap alone) so this can
              actually shrink and ellipsis instead of overflowing past the
              header or getting clipped under the icon buttons — Indonesian
              role names run noticeably longer than their English ones
              (e.g. "Petugas Kebersihan Toilet", "Supervisor Keamanan
              Pangan", "General Manager (seluruh site)"). */}
          <div className="hidden xs:block min-w-0 max-w-[45vw] sm:max-w-none bg-psu-blue/10 text-psu-blue text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider truncate">
            {t(`roles.${user.role}`)}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowInstallGuide(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-psu-green/10 text-psu-green text-[10px] font-black uppercase tracking-wider hover:bg-psu-green/20 transition-colors"
          >
            <Download size={13} />
            {t('layout.installApp')}
          </button>
          <button
            onClick={() => setShowInstallGuide(true)}
            className="sm:hidden w-9 h-9 rounded-full bg-psu-green/10 text-psu-green flex items-center justify-center"
            aria-label={t('layout.installApp')}
          >
            <Download size={16} />
          </button>

          <button
            onClick={toggleLanguage}
            className="w-9 h-9 rounded-full bg-psu-gray/5 text-psu-gray text-[10px] font-black flex items-center justify-center uppercase hover:bg-psu-gray/10 transition-colors"
            aria-label={t('languageToggle.label')}
            title={t('languageToggle.label')}
          >
            {language === 'en' ? 'ID' : 'EN'}
          </button>

          {rejectedNotices.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowNotices(o => !o)}
                className="relative w-9 h-9 rounded-full bg-psu-rejected/10 text-psu-rejected flex items-center justify-center hover:bg-psu-rejected/20 transition-colors"
                aria-label={t('layout.notificationsLabel')}
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-psu-rejected text-white text-[9px] font-black flex items-center justify-center">
                  {rejectedNotices.length}
                </span>
              </button>
              <AnimatePresence>
                {showNotices && (
                  <>
                    {/* Click-outside catcher, same pattern as a modal backdrop but transparent. */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotices(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-11 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-psu-gray/10 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-psu-gray uppercase tracking-widest">{t('layout.notificationsTitle')}</h3>
                        <button onClick={() => setShowNotices(false)} className="text-psu-gray/30 hover:text-psu-rejected transition-colors">
                          <XCircle size={16} />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {rejectedNotices.map(n => (
                          <div key={n.id} className="bg-psu-rejected/5 border border-psu-rejected/10 rounded-xl p-3">
                            <p className="text-xs font-bold text-psu-gray">{n.title}</p>
                            {n.reason && <p className="text-[11px] text-psu-gray/60 font-medium mt-1">{n.reason}</p>}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-psu-gray/40 font-medium leading-relaxed border-t border-psu-gray/5 pt-3">
                        {t('layout.notificationsHint')}
                      </p>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-psu-gray">{user.name}</div>
            {user.site && (
              <div className="text-[10px] uppercase text-psu-gray/50 font-semibold tracking-tighter flex items-center gap-1 justify-end">
                <MapPin size={10} className="text-psu-blue" />
                {user.site}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-full bg-psu-gray/5 flex items-center justify-center text-psu-gray hover:text-psu-rejected transition-colors"
            aria-label={t('layout.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {storageError && (
        <div className="bg-psu-warning/10 border-b border-psu-warning/20 text-psu-warning px-4 sm:px-6 py-3 flex items-start gap-2.5 text-xs font-medium">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{storageError === 'quota' ? t('layout.storageQuotaWarning') : t('layout.storageUnknownWarning')}</span>
        </div>
      )}

      <main className="flex-1 container max-w-6xl mx-auto p-6">
        {children}
      </main>

      <InstallGuide open={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </div>
  );
}
