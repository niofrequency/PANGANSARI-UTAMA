import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('psu_language');
    return saved === 'id' || saved === 'en' ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('psu_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const toggleLanguage = () => setLanguageState(prev => (prev === 'en' ? 'id' : 'en'));

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

// Usage: const { t } = useTranslation(); t('common.approve')
// Supports simple {placeholder} interpolation: t('technician.warningAlert', { count: 2 })
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  const { language } = ctx;

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let value = getPath(translations[language], key);
    if (value === undefined) value = getPath(translations.en, key); // fallback
    if (value === undefined) return key; // last resort, surfaces missing keys during dev
    if (typeof value !== 'string') return value as unknown as string;
    if (vars) {
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        value
      );
    }
    return value;
  };

  // For array-valued entries (e.g. install steps)
  const tList = (key: string): string[] => {
    let value = getPath(translations[language], key);
    if (value === undefined) value = getPath(translations.en, key);
    return Array.isArray(value) ? value : [];
  };

  return { t, tList, language: ctx.language, setLanguage: ctx.setLanguage, toggleLanguage: ctx.toggleLanguage };
}
