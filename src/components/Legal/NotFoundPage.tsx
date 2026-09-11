// Real 404 for an unrecognized URL — e.g. a stale bookmark, a mistyped
// link, or a `/go` QR that's since been retired. Before this existed,
// vercel.json's SPA rewrite (`/(.*) -> /index.html`) meant any unknown
// path silently loaded the normal app instead (Login screen or whatever
// portal the visitor was already signed into) with no sign anything was
// wrong. See App.tsx for the pathname check that routes here.

import React from 'react';
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export function NotFoundPage() {
  const { t, language, toggleLanguage } = useTranslation();

  return (
    <div className="min-h-screen bg-psu-bg font-sans flex flex-col">
      <header className="flex items-center justify-end px-4 sm:px-6 py-3">
        <button
          onClick={toggleLanguage}
          className="w-9 h-9 rounded-full bg-white text-psu-gray text-[10px] font-black flex items-center justify-center uppercase border border-psu-gray/10 hover:bg-psu-gray/5 transition-colors"
          aria-label={t('languageToggle.label')}
          title={t('languageToggle.label')}
        >
          {language === 'en' ? 'ID' : 'EN'}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-psu-blue/10 text-psu-blue flex items-center justify-center mb-6">
          <MapPinOff size={28} />
        </div>
        <div className="text-4xl font-black text-psu-gray/15 tracking-tight mb-1">404</div>
        <h1 className="text-xl font-bold text-psu-gray">{t('pageNotFound.title')}</h1>
        <p className="mt-2 text-sm text-psu-gray/50 font-medium max-w-xs">{t('pageNotFound.body')}</p>
        <a
          href="/"
          className="mt-8 flex items-center gap-2 px-6 py-3 bg-psu-green text-white rounded-2xl font-bold text-sm shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} />
          {t('pageNotFound.backButton')}
        </a>
      </main>
    </div>
  );
}
