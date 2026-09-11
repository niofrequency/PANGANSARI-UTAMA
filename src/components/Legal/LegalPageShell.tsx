// Shared shell for the three standalone legal pages (Privacy, Terms,
// Cookies) — reachable directly at /privacy, /terms, /cookies (see
// App.tsx) with no login required, so a phone's app-store reviewer, a
// new hire, or anyone else can read them without an account. Deliberately
// outside Layout.tsx (no portal chrome, no auth check) since these pages
// have to work even when nobody is signed in.

import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { LegalSection, LEGAL_LAST_UPDATED } from '../../data/legalContent';
import { cn } from '../../utils/cn';

const LEGAL_PAGES = [
  { href: '/privacy', labelKey: 'legal.privacyTitle' },
  { href: '/terms', labelKey: 'legal.termsTitle' },
  { href: '/cookies', labelKey: 'legal.cookiesTitle' },
] as const;

export function LegalPageShell({
  titleKey,
  sections,
  activeHref,
}: {
  titleKey: string;
  sections: LegalSection[];
  activeHref: (typeof LEGAL_PAGES)[number]['href'];
}) {
  const { t, language, toggleLanguage } = useTranslation();

  return (
    <div className="min-h-screen bg-psu-bg font-sans flex flex-col">
      <header className="bg-white border-b border-psu-gray/10 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <a
          href="/"
          className="flex items-center gap-2 text-psu-gray/60 hover:text-psu-gray text-xs font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          {t('legal.backHome')}
        </a>
        <button
          onClick={toggleLanguage}
          className="w-9 h-9 rounded-full bg-psu-gray/5 text-psu-gray text-[10px] font-black flex items-center justify-center uppercase hover:bg-psu-gray/10 transition-colors"
          aria-label={t('languageToggle.label')}
          title={t('languageToggle.label')}
        >
          {language === 'en' ? 'ID' : 'EN'}
        </button>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-psu-blue/10 text-psu-blue flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-psu-gray">{t(titleKey)}</h1>
        </div>
        <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mb-8 ml-[52px]">
          {t('legal.lastUpdated')} — {LEGAL_LAST_UPDATED}
        </p>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="card">
              <h2 className="text-sm font-bold text-psu-gray mb-2">
                {language === 'id' ? section.headingId : section.headingEn}
              </h2>
              <div className="text-xs text-psu-gray/60 font-medium leading-relaxed space-y-2">
                {(language === 'id' ? section.bodyId : section.bodyEn).split('\n\n').map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-psu-gray/40 font-medium mt-6 px-1">{t('legal.contactNote')}</p>

        <nav className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-psu-gray/10">
          {LEGAL_PAGES.map(page => (
            <a
              key={page.href}
              href={page.href}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
                page.href === activeHref
                  ? 'bg-psu-gray text-white'
                  : 'bg-white text-psu-gray/50 border border-psu-gray/10 hover:text-psu-gray'
              )}
            >
              {t(page.labelKey)}
            </a>
          ))}
        </nav>

        <div className="mt-8 text-center">
          <span className="text-[9px] text-psu-gray/30 font-black uppercase tracking-[0.2em]">{t('legal.companyLine')}</span>
        </div>
      </main>
    </div>
  );
}
