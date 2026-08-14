import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, MapPin, Download } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { InstallGuide } from './InstallGuide';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Layout({ user, onLogout, children }: LayoutProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-psu-gray/10 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm/5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/icons/psu-mark.png" alt="PSU" className="h-8 w-auto shrink-0" />
          <div className="hidden xs:block bg-psu-blue/10 text-psu-blue text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
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

      <main className="flex-1 container max-w-6xl mx-auto p-6">
        {children}
      </main>

      <InstallGuide open={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </div>
  );
}
