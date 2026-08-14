import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { isFirebaseConfigured } from '../lib/firebase';

interface LoginProps {
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
}

export function Login({ onLogin }: LoginProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError(t('auth.errorInvalid'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#F7F8F7]">
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
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-psu-gray/5 p-10 border border-psu-gray/5"
      >
        <div className="flex flex-col items-center mb-10">
          <img src="/icons/psu-logo-full.png" alt="Pangansari Utama" className="h-20 w-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-psu-gray">FIELD<span className="text-psu-green">OPS</span></h1>
          <p className="text-psu-gray/40 text-[10px] font-bold uppercase tracking-widest mt-2">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('auth.emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-psu-gray/30" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('auth.passwordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-psu-gray/30" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2 p-4 bg-red-50 text-psu-rejected text-xs rounded-xl border border-red-100 font-medium"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {isFirebaseConfigured && (
            <div className="flex items-start gap-2 p-3 bg-psu-blue/5 text-psu-blue/70 text-[11px] rounded-xl">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>{t('auth.firstLoginHint')}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full bg-psu-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60">
            <LogIn size={18} />
            {isSubmitting ? t('common.loading') : t('auth.submitButton')}
          </button>
        </form>

        <div className="mt-12 text-center">
          <span className="text-[9px] text-psu-gray/30 font-black uppercase tracking-[0.2em]">{t('auth.footer')}</span>
        </div>
      </motion.div>
    </div>
  );
}
