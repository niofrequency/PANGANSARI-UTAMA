import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { isFirebaseConfigured } from '../lib/firebase';

interface LoginProps {
  onLogin: (email: string, password: string) => string | null | Promise<string | null>;
  onLoginWithGoogle?: () => string | null | Promise<string | null>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.4 10.6z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.8 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.6 5.6C41.5 36.3 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

export function Login({ onLogin, onLoginWithGoogle }: LoginProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const errorMessage = (code: string | null): string => {
    switch (code) {
      case null: return '';
      case 'inactive': return t('auth.errorInactive');
      case 'no-invite': return t('auth.errorNoInvite');
      case 'popup-closed': return t('auth.errorPopupClosed');
      default: return t('auth.errorInvalid');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.errorEmpty'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await onLogin(email, password);
      setError(errorMessage(result));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!onLoginWithGoogle) return;
    setError('');
    setIsGoogleSubmitting(true);
    try {
      const result = await onLoginWithGoogle();
      setError(errorMessage(result));
    } finally {
      setIsGoogleSubmitting(false);
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

        {isFirebaseConfigured && onLoginWithGoogle && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-psu-gray/10 bg-white text-psu-gray font-bold text-sm active:scale-95 transition-all disabled:opacity-60 shadow-sm"
            >
              <GoogleIcon />
              {isGoogleSubmitting ? t('common.loading') : t('auth.googleButton')}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-psu-gray/10" />
              <span className="text-[10px] font-black text-psu-gray/30 uppercase tracking-widest">{t('auth.orDivider')}</span>
              <div className="flex-1 h-px bg-psu-gray/10" />
            </div>
          </>
        )}

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

          <button type="submit" disabled={isSubmitting || isGoogleSubmitting} className="w-full bg-psu-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60">
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
