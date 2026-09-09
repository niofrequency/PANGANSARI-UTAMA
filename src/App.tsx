/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Login } from './components/Auth';
import { StaffIdGate } from './components/StaffIdGate';
import { Layout } from './components/Layout';
import { HousekeeperPortal } from './components/Portals/HousekeeperPortal';
import { LaundryStaffPortal } from './components/Portals/LaundryStaffPortal';
import { JanitorPortal } from './components/Portals/JanitorPortal';
import { SupervisorPortal } from './components/Portals/SupervisorPortal';
import { ManagerPortal } from './components/Portals/ManagerPortal';
import { TechnicianPortal } from './components/Portals/TechnicianPortal';
import { AdminPortal } from './components/Admin/AdminPortal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useTranslation } from './i18n/LanguageContext';
import { DeepLinkJob, parseDeepLink, consumeDeepLink, clearDeepLink, setDeepLink } from './lib/deepLink';
import { UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';

// Roles that never take a job QR — see PSU_QR_JobDeepLink_PRD.md's Users
// table. Anyone in this list keeps their normal email login and portal no
// matter what `/go` link brought them here.
const OFFICE_ROLES: UserRole[] = [
  'ADMIN',
  'HOUSEKEEPING_SUPERVISOR',
  'HOUSEKEEPING_MANAGER',
  'FOOD_SAFETY_SUPERVISOR',
  'FOOD_SAFETY_MANAGER',
  'GENERAL_MANAGER',
];

const TECHNICIAN_ACTIONS: DeepLinkJob['action'][] = ['fridge', 'core', 'clean', 'wellness'];

export default function App() {
  const store = useAppStore();
  const { currentUser, logout, isAuthResolving, storageError, sites } = store;
  const { t } = useTranslation();

  // Parsed once at boot: either freshly read off a `/go?...` URL (and
  // immediately persisted + stripped from the address bar — see
  // deepLink.ts) or whatever was still pending in sessionStorage from
  // before a refresh.
  const [pendingJob, setPendingJob] = useState<DeepLinkJob | null>(() => parseDeepLink() || consumeDeepLink());
  // "Kantor? Log in dengan email" on StaffIdGate — lets an office person
  // who happens to open a job link (or a phone that still has one queued)
  // fall through to the normal Login screen instead of being stuck on a
  // Staff ID pad that isn't for them.
  const [showEmailLoginOverride, setShowEmailLoginOverride] = useState(false);
  // True only when the CURRENT session was created by StaffIdGate rather
  // than a real email/Google sign-in — used to apply the shared-device
  // default of logging out again right after the job is submitted (see
  // PRD "Defaults if nobody decides"), instead of leaving a frontline
  // session open on a device other staff will pick up next.
  const [loggedInViaStaffCode, setLoggedInViaStaffCode] = useState(false);

  // A pending job that doesn't belong to the person now signed in — either
  // an office role (job QRs are never for them) or a frontline role whose
  // department doesn't match the scanned action (e.g. a Housekeeper's ID
  // entered after a fridge scan) — is simply irrelevant. Drop it instead of
  // leaving it to linger: "wrong role after ID" always means "go to your
  // normal home," never a blocked or half-applied job screen.
  useEffect(() => {
    if (!currentUser || !pendingJob) return;
    const isTechnicianJob = TECHNICIAN_ACTIONS.includes(pendingJob.action);
    const roleMatches = isTechnicianJob
      ? currentUser.role === 'FOOD_SAFETY_TECHNICIAN'
      : currentUser.role === 'HOUSEKEEPER';
    if (OFFICE_ROLES.includes(currentUser.role) || !roleMatches) {
      clearDeepLink();
      setPendingJob(null);
    }
  }, [currentUser, pendingJob]);

  const handleDeepLinkHandled = () => {
    clearDeepLink();
    setPendingJob(null);
    setShowEmailLoginOverride(false);
    if (loggedInViaStaffCode) {
      // Shared-device default: don't leave the next person on this
      // device signed in as whoever just finished a scanned job.
      logout();
      setLoggedInViaStaffCode(false);
    }
  };

  // Fed to the "Scan job" button both on StaffIdGate and on the
  // Technician/Housekeeper home screens — lets someone already signed in
  // jump straight to a newly-scanned job without a page reload.
  const handleScanJob = (job: DeepLinkJob) => {
    setDeepLink(job);
    setPendingJob(job);
    setShowEmailLoginOverride(false);
  };

  const handleStaffIdSuccess = () => {
    setLoggedInViaStaffCode(true);
  };

  // Simple routing based on role
  const renderPortal = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case 'ADMIN':
        // Any account whose Firestore role is ADMIN gets the Admin Portal
        // — not just the original bootstrap account (SUPER_ADMIN_EMAIL).
        // That's trustworthy on its own now: only an existing admin can
        // ever set someone else's role to ADMIN in the first place (see
        // firestore.rules' isAdmin()/updateUserRole in useAppStore.ts), so
        // there's no "role field claims ADMIN but shouldn't be trusted"
        // case left to guard against here.
        return <AdminPortal store={store} />;
      case 'HOUSEKEEPER': {
        const job = pendingJob && pendingJob.action === 'room' ? pendingJob : null;
        return (
          <HousekeeperPortal
            store={store}
            startBarak={job?.barak}
            startRoom={job?.roomId}
            expectedSite={job?.siteId}
            onDeepLinkHandled={handleDeepLinkHandled}
            onScanJob={handleScanJob}
          />
        );
      }
      case 'HOUSEKEEPING_LAUNDRY':
        return <LaundryStaffPortal store={store} />;
      case 'HOUSEKEEPING_JANITOR':
        return <JanitorPortal store={store} />;
      case 'HOUSEKEEPING_SUPERVISOR':
      case 'FOOD_SAFETY_SUPERVISOR':
        return <SupervisorPortal store={store} />;
      case 'HOUSEKEEPING_MANAGER':
      case 'FOOD_SAFETY_MANAGER':
      case 'GENERAL_MANAGER':
        return <ManagerPortal store={store} />;
      case 'FOOD_SAFETY_TECHNICIAN': {
        const job = pendingJob && TECHNICIAN_ACTIONS.includes(pendingJob.action) ? pendingJob : null;
        return (
          <TechnicianPortal
            store={store}
            startAt={job?.action as 'fridge' | 'core' | 'clean' | 'wellness' | undefined}
            expectedSite={job?.siteId}
            onDeepLinkHandled={handleDeepLinkHandled}
            onScanJob={handleScanJob}
          />
        );
      }
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

  const showStaffIdGate = !currentUser && !!pendingJob && !showEmailLoginOverride;

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
        ) : showStaffIdGate ? (
          <motion.div key="staff-id-gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StaffIdGate
              pendingJob={pendingJob!}
              sites={sites}
              loginByStaffCode={store.loginByStaffCode}
              onSuccess={handleStaffIdSuccess}
              onSwitchToEmailLogin={() => setShowEmailLoginOverride(true)}
              onScanJob={handleScanJob}
            />
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
            <Layout user={currentUser} onLogout={logout} storageError={storageError}>
              {renderPortal()}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
      <PWAInstallPrompt />
    </div>
  );
}
