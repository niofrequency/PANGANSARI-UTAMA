/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Login } from './components/Auth';
import { Layout } from './components/Layout';
import { HousekeeperPortal } from './components/Portals/HousekeeperPortal';
import { SupervisorPortal } from './components/Portals/SupervisorPortal';
import { ManagerPortal } from './components/Portals/ManagerPortal';
import { TechnicianPortal } from './components/Portals/TechnicianPortal';
import { AdminPortal } from './components/Admin/AdminPortal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useTranslation } from './i18n/LanguageContext';
import { SUPER_ADMIN_EMAIL } from './services/authService';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const store = useAppStore();
  const { currentUser, logout, isAuthResolving } = store;
  const { t } = useTranslation();

  // Simple routing based on role
  const renderPortal = () => {
    if (!currentUser) return <Login onLogin={store.login} onLoginWithGoogle={store.loginWithGoogle} />;

    switch (currentUser.role) {
      case 'ADMIN':
        // Route guard, mirrored from the store's login-time check: never
        // render the Admin Portal for anyone but the designated address,
        // even if a role field somewhere claims ADMIN.
        if (currentUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
              <h2 className="text-xl font-bold text-slate-gray">{t('accessRestricted.title')}</h2>
              <p className="mt-2 text-slate-500">{t('accessRestricted.body')}</p>
              <button onClick={logout} className="mt-6 px-6 py-2 bg-psu-green text-white rounded-lg font-medium">
                {t('common.backToLogin')}
              </button>
            </div>
          );
        }
        return <AdminPortal store={store} />;
      case 'HOUSEKEEPER':
        return <HousekeeperPortal store={store} />;
      case 'HOUSEKEEPING_SUPERVISOR':
      case 'FOOD_SAFETY_SUPERVISOR':
        return <SupervisorPortal store={store} />;
      case 'HOUSEKEEPING_MANAGER':
      case 'FOOD_SAFETY_MANAGER':
      case 'GENERAL_MANAGER':
        return <ManagerPortal store={store} />;
      case 'FOOD_SAFETY_TECHNICIAN':
        return <TechnicianPortal store={store} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <h2 className="text-xl font-bold text-slate-gray">{t('portalNotFound.title')}</h2>
            <p className="mt-2 text-slate-500">{t('portalNotFound.body')}</p>
            <button 
              onClick={logout}
              className="mt-6 px-6 py-2 bg-psu-green text-white rounded-lg font-medium"
            >
              {t('common.backToLogin')}
            </button>
          </div>
        );
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-psu-bg font-sans">
      <AnimatePresence mode="wait">
        {isAuthResolving ? (
          // First-load auth check still in flight (Firebase mode only) —
          // show this instead of flashing the Login screen at someone
          // who's actually still logged in.
          <motion.div
            key="auth-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen"
          >
            <img src="/icons/psu-mark.png" alt="" className="h-10 w-auto animate-pulse opacity-50" />
          </motion.div>
        ) : !currentUser ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Login onLogin={store.login} onLoginWithGoogle={store.loginWithGoogle} />
          </motion.div>
        ) : (
          <motion.div
            key="portal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pb-20"
          >
            <Layout user={currentUser} onLogout={logout}>
              {renderPortal()}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
      <PWAInstallPrompt />
    </div>
  );
}
