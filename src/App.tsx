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
import { PrivacyPolicyPage } from './components/Legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/Legal/TermsOfServicePage';
import { CookiePolicyPage } from './components/Legal/CookiePolicyPage';
import { NotFoundPage } from './components/Legal/NotFoundPage';
import { useTranslation } from './i18n/LanguageContext';
import { DeepLinkAction, DeepLinkJob, parseDeepLink, consumeDeepLink, clearDeepLink, setDeepLink } from './lib/deepLink';
import { titleKeyForChainType } from './data/opsLogsCatalog';
import { UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';

const TECHNICIAN_ACTIONS: DeepLinkJob['action'][] = ['fridge', 'core', 'clean', 'wellness'];

// Which single role a given job QR is for — anyone else (including every
// office role: Admin, Manager, GM) keeps their normal email login and
// portal no matter what `/go` link brought them here. See
// PSU_QR_JobDeepLink_PRD.md's Users table; 'ops_logs' extends that same
// idea to Food Safety Supervisor, whose "job" is just landing on their
// Ops Logs tab rather than one specific field.
const ACTION_ROLE: Record<DeepLinkAction, UserRole> = {
  fridge: 'FOOD_SAFETY_TECHNICIAN',
  core: 'FOOD_SAFETY_TECHNICIAN',
  clean: 'FOOD_SAFETY_TECHNICIAN',
  wellness: 'FOOD_SAFETY_TECHNICIAN',
  room: 'HOUSEKEEPER',
  toilet: 'HOUSEKEEPING_JANITOR',
  laundry: 'HOUSEKEEPING_LAUNDRY',
  ops_logs: 'FOOD_SAFETY_SUPERVISOR',
};

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
  // "Sign in with Staff ID" on the normal Login screen — opens the exact
  // same StaffIdGate a job QR would, just with no pending job to show a
  // badge for or route to afterwards. Staff ID login isn't only for
  // Scan-to-Job: anyone an Admin gave a Staff ID to (AdminPortal's "Staff
  // ID" action) can use it as their everyday sign-in instead of email/
  // password, which both keep working exactly as before.
  const [manualStaffIdLogin, setManualStaffIdLogin] = useState(false);
  // True only when the CURRENT session was created by StaffIdGate rather
  // than a real email/Google sign-in — used to apply the shared-device
  // default of logging out again right after the job is submitted (see
  // PRD "Defaults if nobody decides"), instead of leaving a frontline
  // session open on a device other staff will pick up next.
  const [loggedInViaStaffCode, setLoggedInViaStaffCode] = useState(false);

  // A pending job that doesn't belong to the person now signed in — an
  // office role a job QR was never for, or a frontline/supervisor role
  // whose action doesn't match the scanned one (e.g. a Housekeeper's ID
  // entered after a fridge scan) — is simply irrelevant. Drop it instead of
  // leaving it to linger: "wrong role after ID" always means "go to your
  // normal home," never a blocked or half-applied job screen.
  useEffect(() => {
    if (!currentUser || !pendingJob) return;
    if (currentUser.role !== ACTION_ROLE[pendingJob.action]) {
      clearDeepLink();
      setPendingJob(null);
    }
  }, [currentUser, pendingJob]);

  const handleDeepLinkHandled = () => {
    clearDeepLink();
    setPendingJob(null);
    setShowEmailLoginOverride(false);
    setManualStaffIdLogin(false);
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
    setManualStaffIdLogin(false);
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
      case 'HOUSEKEEPING_LAUNDRY': {
        const job = pendingJob && pendingJob.action === 'laundry' ? pendingJob : null;
        return (
          <LaundryStaffPortal
            store={store}
            fromQr={Boolean(job)}
            onDeepLinkHandled={handleDeepLinkHandled}
            onScanJob={handleScanJob}
          />
        );
      }
      case 'HOUSEKEEPING_JANITOR': {
        const job = pendingJob && pendingJob.action === 'toilet' ? pendingJob : null;
        return (
          <JanitorPortal
            store={store}
            fromQr={Boolean(job)}
            onDeepLinkHandled={handleDeepLinkHandled}
            onScanJob={handleScanJob}
          />
        );
      }
      case 'HOUSEKEEPING_SUPERVISOR':
      case 'FOOD_SAFETY_SUPERVISOR': {
        // Only a Food Safety Supervisor's own action (ops_logs) ever
        // reaches here — ACTION_ROLE already dropped anything else above.
        const job = pendingJob && pendingJob.action === 'ops_logs' && currentUser.role === 'FOOD_SAFETY_SUPERVISOR' ? pendingJob : null;
        return (
          <SupervisorPortal
            store={store}
            startTab={job ? 'OPS_LOGS' : undefined}
            onDeepLinkHandled={handleDeepLinkHandled}
          />
        );
      }
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

  // Notification bell (Layout.tsx): this person's own submissions
  // currently sitting REJECTED, across every type — the daily logs,
  // Gemba Walk, and every Ops Log form all share the same reject/
  // resubmit mechanism now (see opsLogsCatalog.ts's SIGNOFF_CHAINS), so
  // one bell covers all of them regardless of which portal they'd go fix
  // it in.
  const rejectedNotices = currentUser
    ? store.submissions
        .filter(s => s.userId === currentUser.id && s.status === 'REJECTED')
        .map(s => {
          const titleKey = titleKeyForChainType(s.type);
          return { id: s.id, title: titleKey ? t(titleKey) : s.type, reason: s.rejectionReason };
        })
    : [];

  const showStaffIdGate = !currentUser && (!!pendingJob || manualStaffIdLogin) && !showEmailLoginOverride;

  // Standalone pages that live outside the login/portal flow entirely —
  // reachable directly at these URLs (vercel.json rewrites every path to
  // index.html, so this is the only routing these need), no account
  // required. Checked after every hook above so hook order never changes
  // between renders, but before any of the auth/portal JSX below.
  // window.location.pathname is stable for the life of this mounted
  // instance (the app has no client-side navigation), so it always
  // resolves to the same branch on every re-render.
  const pathname = window.location.pathname;
  if (pathname === '/privacy') return <PrivacyPolicyPage />;
  if (pathname === '/terms') return <TermsOfServicePage />;
  if (pathname === '/cookies') return <CookiePolicyPage />;
  if (pathname !== '/' && pathname !== '/go') return <NotFoundPage />;

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
              pendingJob={pendingJob}
              sites={sites}
              loginByStaffCode={store.loginByStaffCode}
              onSuccess={handleStaffIdSuccess}
              onSwitchToEmailLogin={() => { setShowEmailLoginOverride(true); setManualStaffIdLogin(false); }}
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
            <Login
              onLogin={store.login}
              onLoginWithGoogle={store.loginWithGoogle}
              onSwitchToStaffId={() => { setManualStaffIdLogin(true); setShowEmailLoginOverride(false); }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="portal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pb-20"
          >
            <Layout user={currentUser} onLogout={logout} storageError={storageError} rejectedNotices={rejectedNotices}>
              {renderPortal()}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
      <PWAInstallPrompt />
    </div>
  );
}
