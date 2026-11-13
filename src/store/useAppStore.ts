import { useState, useEffect } from 'react';
import { User, Submission, UserRole, Site, Warning, TrainingModule, FieldReport, FieldReportStatus, CorrectiveAction, CorrectiveActionStatus, ChatMessage, CheckSchedule, MissedCheck } from '../types';
import { subscribeMyMessages, addMessageDoc, markMessageReadDoc, editMessageDoc, deleteMessageForEveryoneDoc, hideMessageForMeDoc } from '../services/chatService';
import { canChatUsers, conversationId, canStillEdit } from '../lib/chatPolicy';
import { registerPush, unregisterPush, setAppBadgeCount } from '../lib/pushNotifications';
import { INITIAL_USERS, INITIAL_SUBMISSIONS, INITIAL_WARNINGS, INITIAL_FIELD_REPORTS, INITIAL_CORRECTIVE_ACTIONS, SITES, TRAINING_MODULES } from '../data/mockData';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  loginOrRegister,
  loginWithGoogle as loginWithGoogleService,
  loginByStaffCode as loginByStaffCodeService,
  logout as firebaseLogout,
  watchAuthAndProfile,
  SUPER_ADMIN_EMAIL,
} from '../services/authService';
import { subscribeUsers, updateUserRoleDoc, updateUserSiteDoc, updateUserAssignedSitesDoc, setStaffIdentityDoc, toggleUserActiveDoc, deleteUserDoc } from '../services/usersService';
import { createStaffAccountDirect } from '../services/adminCreateAccount';
import { resetStaffCredentials } from '../services/adminResetCredentials';
import { subscribeSubmissions, fetchOlderSubmissions, liveWindowStartISO, addSubmissionDoc, updateSubmissionDoc, CLEAR_FIELD, type SubmissionScope } from '../services/submissionsService';
import { sitesForScope } from '../lib/siteScope';
import { subscribeCheckSchedules, subscribeMissedChecks, addCheckScheduleDoc, updateCheckScheduleDoc, deleteCheckScheduleDoc } from '../services/checksService';
import { localDateISO } from '../utils/localDate';
import { setErrorReporterRole } from '../lib/errorReporter';

// Roles that see missed-check alerts and can open the check schedule.
export const CHECK_VIEWER_ROLES: UserRole[] = [
  'ADMIN', 'GENERAL_MANAGER',
  'HOUSEKEEPING_MANAGER', 'FOOD_SAFETY_MANAGER',
  'HOUSEKEEPING_SUPERVISOR', 'FOOD_SAFETY_SUPERVISOR',
  'HOUSEKEEPING_LEADHAND', 'FOOD_SAFETY_LEADHAND',
];
import { subscribeWarnings, addWarningDoc } from '../services/warningsService';
import { subscribeFieldReports, addFieldReportDoc, updateFieldReportDoc } from '../services/fieldReportsService';
import { subscribeCorrectiveActions, addCorrectiveActionDoc, updateCorrectiveActionDoc } from '../services/correctiveActionsService';
import { subscribeTrainings, completeTrainingDoc } from '../services/trainingsService';
import { isValidStaffCode } from '../utils/staffCode';
import { SIGNOFF_CHAINS } from '../data/opsLogsCatalog';
import { outboxDb } from '../lib/outboxDb';

// This store has two modes: 
//
//  - DEMO MODE (default, no Firebase env vars set): everything lives in
//    localStorage, exactly as in the original prototype. Zero setup, works
//    immediately after `git clone` with no backend at all. 
// 
//  - FIREBASE MODE (VITE_FIREBASE_* env vars present, e.g. set in Vercel):
//    user accounts, roles, and auth are backed by real Firebase
//    Authentication + Firestore, so an admin's role assignments actually
//    persist across devices and are enforced server-side (see
//    firestore.rules). Submissions/warnings/trainings/field reports still
//    use localStorage in this version — see FIREBASE_SETUP.md for notes on
//    extending that the same way.
//
// Every component using this hook is unaffected by which mode is active;
// the returned shape is identical either way.

// Staff ID sessions that couldn't be upgraded to a real Firebase Auth
// session (mintStaffCodeToken unavailable) live only in React state, so a
// mobile browser reloading a backgrounded tab would sign them out. Kept in
// localStorage until they press Logout (or the shared-device auto-logout
// after a scanned job runs).
const PIN_SESSION_KEY = 'psu_pin_session_v1';
function readPinSession(): User | null {
  try {
    const raw = localStorage.getItem(PIN_SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function writePinSession(user: User) {
  try {
    localStorage.setItem(PIN_SESSION_KEY, JSON.stringify(user));
  } catch {
    // storage blocked — session just won't survive a reload
  }
}
function clearPinSession() {
  try {
    localStorage.removeItem(PIN_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function useAppStore() {
  // v2: key names bumped once, deliberately, to invalidate an old cache of
  // fake demo data (30 days of randomly-generated submissions) that was
  // seeded by an earlier version of this app and would otherwise linger in
  // people's browsers forever, even after mockData.ts was cleared out —
  // localStorage persists across deploys, so clearing the source file
  // alone doesn't clear what's already saved on a given device.
  //
  // v3: bumped again for the same reason, in reverse — mockData.ts went
  // from empty (INITIAL_USERS = []) to real seed data in this version.
  // Anyone who'd ever opened the app in demo mode before that change
  // already has an empty `psu_users_v4` array saved, which is truthy and
  // so permanently shadows the new INITIAL_USERS fallback below — the new
  // seed accounts would silently never appear for them. The v3 key forces
  // everyone back onto the fallback once.
  //
  // v4: same reason again, back the other way — all the demo/mock seed
  // data (fictional cast, real-roster duplicate, sample submissions,
  // warnings, trainings) was deleted from mockData.ts, since real accounts
  // now live in Firebase. Anyone still on localStorage/demo mode with a
  // populated `psu_users_v4` from before that change would otherwise keep
  // seeing that stale mock roster forever. Do not change these key names
  // again without a good reason; every bump wipes local data for anyone
  // still on localStorage (demo) mode.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isFirebaseConfigured) return null; // resolved async by watchAuthAndProfile below
    const saved = localStorage.getItem('psu_current_user_v4');
    return saved ? JSON.parse(saved) : null;
  });

  // In Firebase mode, we can't know synchronously on page load whether the
  // person is still logged in — Firebase Auth has to check its persisted
  // session first, which is async. Without tracking that separately, the
  // app would briefly (sometimes not-so-briefly, if it's slow) show the
  // Login screen on every refresh even for someone who's still logged in,
  // which reads as "refreshing logs me out". This flag gates that: App.tsx
  // shows a loading state instead of the Login screen until the first
  // auth check has actually resolved.
  const [isAuthResolving, setIsAuthResolving] = useState(isFirebaseConfigured);

  // True while currentUser was set by loginByStaffCode (Scan-to-Job) rather
  // than a real Firebase Auth sign-in. These sessions have no ID token, so
  // the users-collection subscription below (which needs isSignedIn() per
  // firestore.rules) is skipped for them rather than left to fail with a
  // logged permission-denied on every one — see loginByStaffCode's comment
  // in authService.ts for why that's an accepted tradeoff, not a bug.
  const [pinSessionActive, setPinSessionActive] = useState(false);

  const [users, setUsers] = useState<User[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeUsers below
    const saved = localStorage.getItem('psu_users_v4');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeSubmissions below
    const saved = localStorage.getItem('psu_submissions_v4');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [warnings, setWarnings] = useState<Warning[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeWarnings below
    const saved = localStorage.getItem('psu_warnings_v4');
    return saved ? JSON.parse(saved) : INITIAL_WARNINGS;
  });

  // In-app chat (components/Chat/ChatTab.tsx). Firebase mode: only the
  // messages this user is a participant in (see subscribeMyMessages).
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isFirebaseConfigured) return [];
    const saved = localStorage.getItem('psu_messages_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [fieldReports, setFieldReports] = useState<FieldReport[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeFieldReports below
    const saved = localStorage.getItem('psu_field_reports_v1');
    return saved ? JSON.parse(saved) : INITIAL_FIELD_REPORTS;
  });

  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeCorrectiveActions below
    const saved = localStorage.getItem('psu_corrective_actions_v1');
    return saved ? JSON.parse(saved) : INITIAL_CORRECTIVE_ACTIONS;
  });

  const [trainings, setTrainings] = useState<TrainingModule[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeTrainings below
    const saved = localStorage.getItem('psu_trainings_v4');
    return saved ? JSON.parse(saved) : TRAINING_MODULES;
  });

  // One-time cleanup: remove the old (pre-v2, v2, and v3) keys so they
  // don't sit around unused forever in people's browsers.
  useEffect(() => {
    [
      'psu_current_user', 'psu_users', 'psu_submissions', 'psu_warnings', 'psu_trainings',
      'psu_current_user_v2', 'psu_users_v2', 'psu_submissions_v2', 'psu_warnings_v2', 'psu_trainings_v2',
      'psu_current_user_v3', 'psu_users_v3', 'psu_submissions_v3', 'psu_warnings_v3', 'psu_trainings_v3',
    ].forEach((key) => localStorage.removeItem(key));
  }, []);

  // --- Firebase mode: live subscriptions ---
  // Auth and the users-collection subscription are deliberately in
  // separate effects, with the second one gated on `currentUser` actually
  // being resolved (not just "Firebase is configured"). Starting the
  // users-collection listener in parallel with the auth check used to
  // cause an intermittent bug: on a slower/fresh session (e.g. a mobile
  // browser with no cached auth token yet), that Firestore query could
  // fire before the login token was attached, get rejected by
  // firestore.rules (`isSignedIn()`), and then — because Firestore
  // treats permission-denied as terminal, not something it retries —
  // silently leave the Personnel list empty forever, even after login
  // fully succeeded moments later. Waiting for currentUser first removes
  // the race entirely.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubAuth = watchAuthAndProfile((user) => {
      if (!user) {
        // A Staff ID session that never got a real Firebase Auth token
        // (see loginByStaffCode) has nothing for Firebase to restore, so on
        // a phone that reloaded the tab after the person switched apps it
        // used to land back on Login. Restore it from localStorage instead.
        const saved = readPinSession();
        if (saved) {
          setPinSessionActive(true);
          setCurrentUser(saved);
          setIsAuthResolving(false);
          return;
        }
      }
      setCurrentUser(user);
      setIsAuthResolving(false); // first callback = the initial check is done, whatever it found
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setUsers([]);
      return;
    }
    const unsubUsers = subscribeUsers(setUsers);
    return () => unsubUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  // Same live-subscription pattern as users above — this is what actually
  // makes a submission a Technician files show up on a Supervisor's
  // different device. pinSessionActive is skipped for the same reason it
  // is above: a Staff ID session that never got a real Firebase Auth
  // session can't satisfy firestore.rules' isSignedIn().
  //
  // Scoped, not the whole collection (see submissionsService.ts's header):
  // a live listener on the last LIVE_WINDOW_DAYS days + anything still
  // PENDING, limited to this user's sites. Older history only arrives when
  // a History screen asks for it (loadOlderSubmissions below), and is
  // merged into `submissions` alongside the live set, so every lookup by
  // id (stamp/reject/resubmit/delete) still finds it.
  const submissionScopeKey = currentUser ? JSON.stringify(sitesForScope(currentUser)) : '';
  const [liveSubmissions, setLiveSubmissions] = useState<Submission[]>([]);
  const [olderSubmissions, setOlderSubmissions] = useState<Submission[]>([]);
  const [liveWindowStart, setLiveWindowStart] = useState<string>(() => liveWindowStartISO());
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    setOlderSubmissions([]);
    setOlderCursor(null);
    setHasMoreOlder(true);
    if (!currentUser || pinSessionActive) {
      setLiveSubmissions([]);
      return;
    }
    const since = liveWindowStartISO();
    setLiveWindowStart(since);
    const scope: SubmissionScope = { sites: sitesForScope(currentUser) };
    const unsubSubmissions = subscribeSubmissions(scope, since, setLiveSubmissions);
    return () => unsubSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, submissionScopeKey, pinSessionActive]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const byId = new Map<string, Submission>();
    for (const s of olderSubmissions) byId.set(s.id, s);
    for (const s of liveSubmissions) byId.set(s.id, s); // live copy is always the freshest
    setSubmissions(
      Array.from(byId.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
    );
  }, [liveSubmissions, olderSubmissions]);

  // Fetches the next page of history older than what's loaded (one-off
  // read, not live). No-op in demo mode, where everything is local anyway.
  const loadOlderSubmissions = async () => {
    if (!isFirebaseConfigured || !currentUser || pinSessionActive) return;
    if (isLoadingOlder || !hasMoreOlder) return;
    setIsLoadingOlder(true);
    try {
      const before = olderCursor || liveWindowStart;
      const { submissions: page, hasMore } = await fetchOlderSubmissions({ sites: sitesForScope(currentUser) }, before);
      setOlderSubmissions((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...page.filter((s) => !seen.has(s.id))];
      });
      if (page.length > 0) setOlderCursor(page[page.length - 1].timestamp);
      setHasMoreOlder(hasMore);
    } catch (err) {
      console.error('loadOlderSubmissions failed:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const olderHistory = {
    // Demo mode keeps everything in memory, so there's never more to load.
    enabled: isFirebaseConfigured,
    // Everything on or after this date is already loaded (and live).
    loadedFrom: olderCursor || liveWindowStart,
    hasMore: isFirebaseConfigured && hasMoreOlder,
    isLoading: isLoadingOlder,
    loadMore: loadOlderSubmissions,
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setWarnings([]);
      return;
    }
    const unsubWarnings = subscribeWarnings(setWarnings);
    return () => unsubWarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setFieldReports([]);
      return;
    }
    const unsubFieldReports = subscribeFieldReports(setFieldReports);
    return () => unsubFieldReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setCorrectiveActions([]);
      return;
    }
    const unsubCorrectiveActions = subscribeCorrectiveActions(setCorrectiveActions);
    return () => unsubCorrectiveActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setTrainings([]);
      return;
    }
    const unsubTrainings = subscribeTrainings(setTrainings);
    return () => unsubTrainings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  // Missed-check alerts (functions/src/missedChecks.ts) — only people who
  // review or manage sites need them; frontline phones skip both
  // listeners entirely. Demo mode keeps schedules in localStorage so the
  // editor still works, but nothing checks them (that runs on the server).
  useEffect(() => { setErrorReporterRole(currentUser?.role); }, [currentUser?.role]);

  const canSeeChecks = !!currentUser && CHECK_VIEWER_ROLES.includes(currentUser.role);
  const [checkSchedules, setCheckSchedules] = useState<CheckSchedule[]>(() => {
    if (isFirebaseConfigured) return [];
    const saved = localStorage.getItem('psu_check_schedules_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [missedChecks, setMissedChecks] = useState<MissedCheck[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive || !canSeeChecks) {
      setCheckSchedules([]);
      setMissedChecks([]);
      return;
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const unsubSchedules = subscribeCheckSchedules(setCheckSchedules);
    const unsubMissed = subscribeMissedChecks(localDateISO(weekAgo), setMissedChecks);
    return () => { unsubSchedules(); unsubMissed(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive, canSeeChecks]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_check_schedules_v1', JSON.stringify(checkSchedules));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSchedules]);

  const addCheckSchedule = (sched: Omit<CheckSchedule, 'id' | 'createdAt' | 'createdBy'>) => {
    const full = { ...sched, createdAt: new Date().toISOString(), createdBy: currentUser?.id };
    if (isFirebaseConfigured) {
      addCheckScheduleDoc(full).catch((err) => console.error('addCheckSchedule failed:', err));
      return;
    }
    setCheckSchedules((prev) => [...prev, { ...full, id: `cs-${Date.now()}` }]);
  };

  const updateCheckSchedule = (id: string, patch: Partial<Omit<CheckSchedule, 'id'>>) => {
    if (isFirebaseConfigured) {
      updateCheckScheduleDoc(id, patch).catch((err) => console.error('updateCheckSchedule failed:', err));
      return;
    }
    setCheckSchedules((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteCheckSchedule = (id: string) => {
    if (isFirebaseConfigured) {
      deleteCheckScheduleDoc(id).catch((err) => console.error('deleteCheckSchedule failed:', err));
      return;
    }
    setCheckSchedules((prev) => prev.filter((c) => c.id !== id));
  };

  // Set (and cleared) whenever a localStorage write below fails — almost
  // always QuotaExceededError once the browser's per-origin storage limit
  // is hit, which is a real risk here: submissions carry full photos as
  // base64 and never get pruned. Without this, that write throws inside a
  // plain useEffect with nothing catching it, which unmounts the whole
  // app to a blank white screen (see ErrorBoundary.tsx for the last-resort
  // backstop; this is the first line of defense, since it degrades
  // gracefully instead of crashing at all) — and worse, whatever the
  // person just submitted is silently gone, because the write that would
  // have saved it is the one that failed.
  const [storageError, setStorageError] = useState<string | null>(null);

  function safeSetItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
      setStorageError(null);
    } catch (e) {
      console.error(`Failed to save to localStorage (${key}):`, e);
      setStorageError(
        e instanceof DOMException && e.name === 'QuotaExceededError'
          ? 'quota'
          : 'unknown'
      );
    }
  }

  // --- Demo mode: persist everything to localStorage ---
  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_current_user_v4', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_users_v4', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_submissions_v4', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_warnings_v4', JSON.stringify(warnings));
  }, [warnings]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_field_reports_v1', JSON.stringify(fieldReports));
  }, [fieldReports]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_messages_v1', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!currentUser || pinSessionActive) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMyMessages(currentUser.id, setMessages);
    // If this device already allowed notifications, refresh its push token
    // for whoever is signed in now (never prompts — see ChatTab's button).
    registerPush(currentUser.id, currentUser.email, false).catch(() => {});
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id, pinSessionActive]);

  // Unread chat count on the installed app's icon.
  // Messages this user cleared / deleted "for me" never reach the UI.
  const visibleMessages = currentUser ? messages.filter(m => !m.hiddenFor?.includes(currentUser.id)) : messages;
  const unreadChatCount = currentUser ? visibleMessages.filter(m => m.toId === currentUser.id && !m.read && !m.deleted).length : 0;
  useEffect(() => {
    setAppBadgeCount(unreadChatCount);
  }, [unreadChatCount]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_corrective_actions_v1', JSON.stringify(correctiveActions));
  }, [correctiveActions]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    safeSetItem('psu_trainings_v4', JSON.stringify(trainings));
  }, [trainings]);

  const login = async (email: string, password: string, firstName?: string, lastName?: string): Promise<string | null> => {
    if (isFirebaseConfigured) {
      const result = await loginOrRegister(email, password, firstName, lastName);
      // currentUser is set by the watchAuthAndProfile subscription once
      // Firebase Auth's state updates — no need to set it here.
      return result.ok ? null : result.error;
    }

    // Demo mode
    const emailLower = email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === emailLower);

    if (existing) {
      if (!existing.isActive) return 'inactive';
      // ADMIN is no longer locked to the one bootstrap account — any
      // account an existing admin promoted to ADMIN (via updateUserRole)
      // logs in as a real admin. See App.tsx's Admin Portal route, which
      // now trusts role === 'ADMIN' on its own.
      setCurrentUser(existing);
      return null;
    }

    // Open self-signup in demo mode: first name required, last name optional
    if (firstName?.trim()) {
      const fn = firstName.trim();
      const ln = (lastName || '').trim();
      const newUser: User = {
        id: `u-signup-${Date.now()}`,
        firstName: fn,
        lastName: ln,
        name: `${fn} ${ln}`.trim(),
        email: emailLower,
        role: 'FOOD_SAFETY_TECHNICIAN',
        site: 'site-1',
        isActive: true,
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      return null;
    }

    return 'invalid';
  };

  // Google Sign-In only makes sense in Firebase mode — there's no Google
  // account concept in the localStorage demo. Callers should check
  // isFirebaseConfigured before showing the button at all (Auth.tsx does).
  const loginWithGoogle = async (): Promise<string | null> => {
    if (!isFirebaseConfigured) return 'invalid';
    const result = await loginWithGoogleService();
    return result.ok ? null : result.error;
  };

  // Scan-to-Job login (StaffIdGate.tsx): a Staff ID instead of email/
  // password — no PIN, the code itself is the credential (only an Admin
  // ever hands one out). See authService.ts's loginByStaffCode: this now
  // tries to upgrade to a real Firebase Auth session (needed for
  // submissions/warnings to actually sync — see submissionsService.ts),
  // falling back to the old local-only session if that upgrade fails
  // (e.g. the mintStaffCodeToken Cloud Function isn't deployed yet).
  // pinSessionActive stays true only for that fallback case — see the
  // subscription effects above, which skip live Firestore subscriptions
  // for exactly the sessions that have no real Auth token to back them.
  const loginByStaffCode = async (
    staffCode: string,
    password?: string,
  ): Promise<{ ok: boolean; error?: 'unknown-id' | 'inactive' | 'password-required' | 'wrong-password' }> => {
    const codeUpper = staffCode.trim().toUpperCase();

    if (isFirebaseConfigured) {
      const result = await loginByStaffCodeService(codeUpper, password);
      if (!result.ok) return result;
      const p = result.profile;
      setPinSessionActive(!result.authUpgraded);
      const staffUser: User = {
        id: p.uid || codeUpper,
        name: p.name,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email,
        role: p.role,
        site: p.site,
        isActive: p.isActive,
        staffCode: p.staffCode,
        assignedSites: p.assignedSites,
      };
      if (result.authUpgraded) clearPinSession();
      else writePinSession(staffUser);
      setCurrentUser(staffUser);
      return { ok: true };
    }

    // Demo mode
    const match = users.find((u) => u.staffCode?.toUpperCase() === codeUpper);
    if (!match) return { ok: false, error: 'unknown-id' };
    if (!match.isActive) return { ok: false, error: 'inactive' };
    setCurrentUser(match);
    return { ok: true };
  };

  const logout = () => {
    // A Staff ID session never touches Firebase Auth in the first place
    // (see loginByStaffCode above — currentUser is set directly, no
    // signInWith... call happens), so signOut(auth) below has no real
    // session to end and fires no onAuthStateChanged callback — the
    // watchAuthAndProfile effect that normally clears currentUser on
    // logout never runs. Without this, the Logout button was a dead click
    // for anyone signed in with a Staff ID: pinSessionActive flipped off,
    // but currentUser stayed populated forever.
    const wasPinSession = pinSessionActive;
    setPinSessionActive(false);
    clearPinSession();
    setAppBadgeCount(0);
    if (isFirebaseConfigured) {
      // Stop this account's chat pushes reaching this device, then sign
      // out (the token doc can only be deleted while still signed in).
      unregisterPush().finally(() => firebaseLogout());
      if (wasPinSession) setCurrentUser(null);
      return;
    }
    setCurrentUser(null);
  };

  // Dexie outbox (lib/outboxDb.ts) — Firebase mode only; see that file's
  // header for why this exists and why it's a queue, not a second source
  // of truth. `outboxPendingCount` just drives Layout's "Offline — N
  // pending" chip; nothing renders submissions from this table.
  const [outboxPendingCount, setOutboxPendingCount] = useState(0);
  const refreshOutboxCount = () => {
    outboxDb.outbox.count().then(setOutboxPendingCount).catch(() => {});
  };
  // Retries whatever's still queued — on mount (covers "closed the tab
  // mid-outage, reopened it already back online") and every time the
  // browser fires 'online' (covers "stayed on the same screen the whole
  // time Wi-Fi was down"). Each entry is only removed from the outbox
  // once Firestore actually confirms the write; a second failed attempt
  // just leaves it queued for the next trigger.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const flushOutbox = async () => {
      const pending = await outboxDb.outbox.toArray();
      for (const entry of pending) {
        try {
          await addSubmissionDoc(entry.payload as Omit<Submission, 'id'>);
          await outboxDb.outbox.delete(entry.id);
        } catch (err) {
          console.error('Outbox flush failed, still queued:', entry.id, err);
        }
      }
      refreshOutboxCount();
    };
    flushOutbox();
    window.addEventListener('online', flushOutbox);
    return () => window.removeEventListener('online', flushOutbox);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSubmission = (submission: Omit<Submission, 'id'>) => {
    if (isFirebaseConfigured) {
      // Queued in Dexie FIRST, synchronously ahead of the network call —
      // if the tab is killed the instant after this, the write is still
      // sitting in IndexedDB for next launch's flushOutbox to pick up,
      // not lost with the in-flight request. Same fire-and-forget
      // convention as every other Firestore write in this file otherwise:
      // the live subscription above updates `submissions` once the write
      // actually round-trips, not this call directly.
      const outboxId = `ob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      outboxDb.outbox
        .add({ id: outboxId, type: 'submission', payload: submission, createdAt: new Date().toISOString(), status: 'pending' })
        .then(refreshOutboxCount)
        .then(() => addSubmissionDoc(submission))
        .then(() => outboxDb.outbox.delete(outboxId))
        .then(refreshOutboxCount)
        .catch((err) => console.error('addSubmission failed, queued for retry:', err));
      return;
    }
    const newSubmission = { ...submission, id: `s-${Date.now()}` };
    setSubmissions(prev => [newSubmission, ...prev]);
  };

  // A filer removing their own entry from their own History tab — any
  // status, not just PENDING/REJECTED (see ConfirmDeleteModal's "type
  // DELETE" fail-safe in front of every call site, and firestore.rules'
  // matching allow-update for exactly these two fields). Checked here too,
  // not just server-side: this guards demo mode (no rules engine at all)
  // and keeps the UI from ever showing a delete affordance callers
  // wouldn't be allowed to use.
  //
  // This is a SOFT delete, not a real one — see deletedAt/deletedBy on
  // Submission (types.ts). A food-safety/compliance app is exactly the
  // place where "the record disappeared, with nothing left to show it
  // ever existed" is a real problem if anyone (an auditor, a dispute
  // between a worker and a reviewer) ever needs to reconstruct what
  // happened. The record stays in Firestore/localStorage forever, with
  // its original status untouched; `submissions` below just filters
  // every deletedAt-set entry out of what any screen actually shows.
  const deleteSubmission = (submissionId: string) => {
    const target = submissions.find(s => s.id === submissionId);
    if (!target || !currentUser || target.userId !== currentUser.id) return;
    const deletedBy = { userId: currentUser.id, name: currentUser.name };
    const patch = { deletedAt: new Date().toISOString(), deletedBy };

    if (isFirebaseConfigured) {
      updateSubmissionDoc(submissionId, patch).catch((err) => console.error('deleteSubmission failed:', err));
      return;
    }
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, ...patch } : s));
  };

  // Named sign-off chain — every submission type now goes through one
  // (Escalations and Ops Logs merged into one mechanism; see
  // opsLogsCatalog.ts's SIGNOFF_CHAINS). Stamps a named slot (checkedBy/
  // approvedBy/verifiedBy) on the submission's meta.signoff, logged-in
  // user + timestamp, not a signature canvas; if that was the LAST stamp
  // its type's chain requires, the submission also flips from PENDING to
  // APPROVED. Earlier stamps don't change status — the paper stays "in
  // progress" until the final name signs it, same as the source forms.
  // The old single-step Approve/Reject this replaced, updateSubmission
  // Status(), is gone: rejectSignoff() below covers what Reject used to
  // do, and every Approve is now a stamp on some step.
  const addSignoffStamp = (submissionId: string, step: 'checkedBy' | 'approvedBy' | 'verifiedBy') => {
    if (!currentUser) return;
    const stamp = { userId: currentUser.id, name: currentUser.name, at: new Date().toISOString() };

    if (isFirebaseConfigured) {
      const target = submissions.find(s => s.id === submissionId);
      const chain = target && target.type in SIGNOFF_CHAINS ? SIGNOFF_CHAINS[target.type as keyof typeof SIGNOFF_CHAINS] : undefined;
      const isFinalStep = chain ? chain[chain.length - 1] === step : false;
      updateSubmissionDoc(submissionId, {
        [`meta.signoff.${step}`]: stamp,
        // Freshly re-approved — whatever prompted the "Edited after
        // approval" callout is resolved now that a reviewer has actually
        // seen and re-stamped the current content.
        ...(isFinalStep ? { status: 'APPROVED', wasApprovedBeforeEdit: false } : {}),
      }).catch((err) => console.error('addSignoffStamp failed:', err));
      return;
    }

    setSubmissions(prev => prev.map(s => {
      if (s.id !== submissionId) return s;
      const chain = s.type in SIGNOFF_CHAINS ? SIGNOFF_CHAINS[s.type as keyof typeof SIGNOFF_CHAINS] : undefined;
      const nextSignoff = { ...s.meta?.signoff, [step]: stamp };
      const isFinalStep = chain ? chain[chain.length - 1] === step : false;
      return {
        ...s,
        meta: { ...s.meta, signoff: nextSignoff },
        status: isFinalStep ? 'APPROVED' : s.status,
        wasApprovedBeforeEdit: isFinalStep ? false : s.wasApprovedBeforeEdit,
      };
    }));
  };

  // Sends a submission back to whoever filed it instead of advancing the
  // chain — same "someone has to decide" moment a plain Reject always
  // was, just with the sign-off chain's partial progress left in place
  // (as a record of how far it got) until it's actually resubmitted.
  const rejectSignoff = (submissionId: string, reason: string) => {
    if (isFirebaseConfigured) {
      updateSubmissionDoc(submissionId, { status: 'REJECTED', rejectionReason: reason.trim() })
        .catch((err) => console.error('rejectSignoff failed:', err));
      return;
    }
    setSubmissions(prev => prev.map(s => s.id === submissionId
      ? { ...s, status: 'REJECTED' as const, rejectionReason: reason.trim() }
      : s
    ));
  };

  // The submitter fixes and resubmits the SAME record — not a new one —
  // so its original id/timestamp/history stay intact. Restarts the chain
  // from the first step: whatever had already been stamped before this
  // doesn't carry over, since it was stamped against the old content.
  //
  // Despite the name, this isn't gated on the submission actually being
  // REJECTED anymore — a filer can edit any of their own History entries
  // this same way (see the "Edit" affordance next to Delete on each
  // worker portal's History row), including an already-APPROVED one.
  // Always resetting to PENDING (and clearing every prior stamp) is
  // exactly right there too: an approval only vouches for the content it
  // was given, so editing that content has to send it back through
  // review, not silently keep an approval that no longer matches what's
  // actually on the record.
  const resubmitAfterRejection = (submissionId: string, updates: Partial<Pick<Submission, 'items' | 'meta' | 'score'>>) => {
    if (!currentUser) return;
    const target = submissions.find(s => s.id === submissionId);
    if (!target || target.userId !== currentUser.id) return;
    const draftedBy = { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() };
    // A reviewer who already stamped this has no other way to find out
    // the content underneath their approval just changed — this is what
    // lets the queue show "Edited after approval" instead of a plain
    // "Pending" (see wasApprovedBeforeEdit's comment on Submission in
    // types.ts). A normal fix-after-rejection doesn't need the same
    // callout: PENDING/REJECTED already reads as "not done yet."
    const wasApprovedBeforeEdit = target.status === 'APPROVED';

    if (isFirebaseConfigured) {
      updateSubmissionDoc(submissionId, {
        ...updates,
        meta: { ...target.meta, ...updates.meta, signoff: { draftedBy } },
        status: 'PENDING',
        rejectionReason: CLEAR_FIELD,
        wasApprovedBeforeEdit,
      }).catch((err) => console.error('resubmitAfterRejection failed:', err));
      return;
    }

    setSubmissions(prev => prev.map(s => {
      if (s.id !== submissionId) return s;
      return {
        ...s,
        ...updates,
        status: 'PENDING' as const,
        rejectionReason: undefined,
        meta: { ...s.meta, ...updates.meta, signoff: { draftedBy } },
        wasApprovedBeforeEdit,
      };
    }));
  };

  // In Firebase mode this always creates a fully-working, already-activated
  // login on the spot — no invite-only fallback. createStaffAccountDirect
  // creates the Firebase Auth account and the Firestore profile straight
  // from the browser (see that file for how it avoids kicking the admin
  // out of their own session), so it doesn't depend on a Cloud Function
  // being deployed at all. The person can log in immediately with
  // whatever password you hand them.
  const addUser = async (
    user: Omit<User, 'id' | 'isActive'>,
    password: string,
    // Optional Scan-to-Job Staff ID, assignable right at creation time
    // instead of only afterward via setStaffIdentity. No PIN.
    staffIdentity?: { staffCode: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isFirebaseConfigured) {
      const result = await createStaffAccountDirect({ ...user, password, staffCode: staffIdentity?.staffCode });
      if (result.ok) return { ok: true };
      return { ok: false, error: result.error };
    }
    // Demo mode has no server to enforce this, so it has to happen here —
    // without it, Add Staff would silently create a second account on an
    // email that's already in use. login() always resolves an email to
    // whichever matching user comes first in the array, so the new
    // account would be permanently unreachable: nothing tells the admin
    // it happened, and nothing tells the person trying to log into it
    // that they're actually landing in someone else's account instead.
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      return { ok: false, error: 'already-exists' };
    }
    if (staffIdentity && users.some(u => u.staffCode?.toUpperCase() === staffIdentity.staffCode.toUpperCase())) {
      return { ok: false, error: 'staffcode-taken' };
    }
    const newUser: User = {
      ...user,
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isActive: true,
      ...(staffIdentity ? { staffCode: staffIdentity.staffCode } : {}),
    };
    setUsers(prev => [...prev, newUser]);
    return { ok: true };
  };

  // Any admin can promote another account to ADMIN (or demote one back)
  // from here — including granting it. The one account this can never
  // touch is the original bootstrap super-admin, guarded below and in
  // firestore.rules, so there's always at least one admin nobody else can
  // lock out.
  const updateUserRole = (userId: string, role: UserRole) => {
    const target = users.find(u => u.id === userId);
    if (target && target.email.toLowerCase() === SUPER_ADMIN_EMAIL) return;
    if (isFirebaseConfigured) {
      if (target) updateUserRoleDoc(target.email, role);
      return;
    }
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
  };

  const updateUserSite = (userId: string, site: string) => {
    if (isFirebaseConfigured) {
      const target = users.find(u => u.id === userId);
      if (target) updateUserSiteDoc(target.email, site);
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, site } : u));
  };

  // Site Access (lib/siteScope.ts) — which sites a Supervisor/Manager/GM
  // reviews, separate from `site` above (their unchanged home site).
  // null clears the override back to "Home Site only."
  const updateUserAssignedSites = (userId: string, assignedSites: string[] | 'ALL' | null) => {
    if (isFirebaseConfigured) {
      const target = users.find(u => u.id === userId);
      if (target) updateUserAssignedSitesDoc(target.email, assignedSites);
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, assignedSites: assignedSites ?? undefined } : u));
  };

  // Admin-typed login reset (new email and/or new password for someone
  // ELSE's account) — Firebase mode only, and always goes through the
  // adminResetCredentials Cloud Function, since changing a different
  // account's credentials has no client-only path (see that function's
  // comment for why). Requires it to actually be deployed.
  const resetUserCredentials = async (
    userId: string,
    updates: { newEmail?: string; newPassword?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { ok: false, error: 'not-configured' };
    }
    const target = users.find(u => u.id === userId);
    if (!target) return { ok: false, error: 'unknown' };
    const result = await resetStaffCredentials({
      uid: target.id,
      currentEmail: target.email,
      ...updates,
    });
    if (result.ok) return { ok: true };
    return { ok: false, error: result.error };
  };

  // Admin sets/changes a user's Scan-to-Job Staff ID. No PIN — the code
  // itself is the credential, since it's only ever handed out by an Admin.
  const setStaffIdentity = async (
    userId: string,
    staffCode: string
  ): Promise<{ ok: boolean; error?: 'invalid-code' | 'staffcode-taken' | 'unknown' | 'not-configured' }> => {
    const codeUpper = staffCode.trim().toUpperCase();
    if (!isValidStaffCode(codeUpper)) return { ok: false, error: 'invalid-code' };

    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'unknown' };

    if (isFirebaseConfigured) {
      const result = await setStaffIdentityDoc(target.email, codeUpper, target.staffCode);
      return result;
    }

    if (users.some((u) => u.id !== userId && u.staffCode?.toUpperCase() === codeUpper)) {
      return { ok: false, error: 'staffcode-taken' };
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, staffCode: codeUpper } : u)));
    return { ok: true };
  };

  const toggleUserActive = (userId: string) => {
    if (isFirebaseConfigured) {
      const target = users.find(u => u.id === userId);
      if (target) toggleUserActiveDoc(target.email, target.isActive);
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
  };

  const deleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target || target.email.toLowerCase() === SUPER_ADMIN_EMAIL) return; // super-admin can never be deleted
    if (isFirebaseConfigured) {
      deleteUserDoc(target.email, target.staffCode);
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addWarning = (warning: Omit<Warning, 'id'>) => {
    if (isFirebaseConfigured) {
      addWarningDoc(warning).catch((err) => console.error('addWarning failed:', err));
      return;
    }
    const newWarning = { ...warning, id: `w-${Date.now()}` };
    setWarnings(prev => [newWarning, ...prev]);
  };

  // Chat — returns false if this pair isn't allowed to talk (see
  // lib/chatPolicy.ts) or there's nothing to send.
  const sendChatMessage = (to: User, text: string): boolean => {
    const body = text.trim();
    if (!currentUser || !body || !canChatUsers(currentUser, to)) return false;
    const message: Omit<ChatMessage, 'id'> = {
      conversationId: conversationId(currentUser.id, to.id),
      participants: [currentUser.id, to.id],
      fromId: currentUser.id, fromName: currentUser.name, fromEmail: currentUser.email.toLowerCase(),
      toId: to.id, toName: to.name, toEmail: to.email.toLowerCase(),
      text: body.slice(0, 2000),
      createdAt: new Date().toISOString(),
      read: false,
    };
    if (isFirebaseConfigured) {
      addMessageDoc(message).catch((err) => console.error('sendChatMessage failed:', err));
      return true;
    }
    setMessages(prev => [...prev, { ...message, id: `m-${Date.now()}` }]);
    return true;
  };

  // Sender edits their own message's text.
  const editChatMessage = (id: string, text: string): boolean => {
    const body = text.trim();
    const m = messages.find(x => x.id === id);
    if (!currentUser || !m || m.fromId !== currentUser.id || m.deleted || !body || !canStillEdit(m.createdAt)) return false;
    if (isFirebaseConfigured) {
      editMessageDoc(id, body.slice(0, 2000)).catch((err) => console.error('editChatMessage failed:', err));
      return true;
    }
    setMessages(prev => prev.map(x => x.id === id ? { ...x, text: body.slice(0, 2000), editedAt: new Date().toISOString() } : x));
    return true;
  };

  // Sender removes their own message for both people ("This message was
  // deleted" stays in place so the conversation still reads correctly).
  const deleteChatMessageForEveryone = (id: string) => {
    const m = messages.find(x => x.id === id);
    if (!currentUser || !m || m.fromId !== currentUser.id) return;
    if (isFirebaseConfigured) {
      deleteMessageForEveryoneDoc(id).catch((err) => console.error('deleteChatMessageForEveryone failed:', err));
      return;
    }
    setMessages(prev => prev.map(x => x.id === id ? { ...x, deleted: true, text: '', deletedAt: new Date().toISOString() } : x));
  };

  // "Delete for me" / "Clear chat" — hides messages from this user only;
  // the other person still has them.
  const hideChatMessagesForMe = (ids: string[]) => {
    if (!currentUser || ids.length === 0) return;
    if (isFirebaseConfigured) {
      ids.forEach(id => hideMessageForMeDoc(id, currentUser.id).catch((err) => console.error('hideChatMessagesForMe failed:', err)));
      return;
    }
    const set = new Set(ids);
    setMessages(prev => prev.map(x => set.has(x.id) ? { ...x, hiddenFor: [...(x.hiddenFor || []), currentUser.id] } : x));
  };

  // Marks every unread message from `otherId` to me as read.
  const markConversationRead = (otherId: string) => {
    if (!currentUser) return;
    const unread = messages.filter(m => m.fromId === otherId && m.toId === currentUser.id && !m.read);
    if (unread.length === 0) return;
    if (isFirebaseConfigured) {
      unread.forEach(m => markMessageReadDoc(m.id).catch((err) => console.error('markConversationRead failed:', err)));
      return;
    }
    const ids = new Set(unread.map(m => m.id));
    setMessages(prev => prev.map(m => ids.has(m.id) ? { ...m, read: true } : m));
  };

  const addFieldReport = (report: Omit<FieldReport, 'id' | 'status'>) => {
    if (isFirebaseConfigured) {
      addFieldReportDoc({ ...report, status: 'OPEN' }).catch((err) => console.error('addFieldReport failed:', err));
      return;
    }
    const newReport: FieldReport = { ...report, id: `fr-${Date.now()}`, status: 'OPEN' };
    setFieldReports(prev => [newReport, ...prev]);
  };

  // "Seen, working on it" — doesn't require a note, unlike resolving.
  const acknowledgeFieldReport = (id: string) => {
    if (!currentUser) return;
    const patch = { status: 'ACKNOWLEDGED', acknowledgedBy: currentUser.name, acknowledgedAt: new Date().toISOString() };
    if (isFirebaseConfigured) {
      updateFieldReportDoc(id, patch).catch((err) => console.error('acknowledgeFieldReport failed:', err));
      return;
    }
    setFieldReports(prev => prev.map(r => r.id === id
      ? { ...r, ...patch as Partial<FieldReport>, status: 'ACKNOWLEDGED' as FieldReportStatus }
      : r
    ));
  };

  // "Fixed" — the note is required so whoever filed the report actually
  // sees what was done about it, not just a status flip.
  const resolveFieldReport = (id: string, note: string) => {
    if (!currentUser) return;
    const patch = { status: 'RESOLVED', resolvedBy: currentUser.name, resolvedAt: new Date().toISOString(), resolutionNote: note.trim() };
    if (isFirebaseConfigured) {
      updateFieldReportDoc(id, patch).catch((err) => console.error('resolveFieldReport failed:', err));
      return;
    }
    setFieldReports(prev => prev.map(r => r.id === id
      ? { ...r, ...patch as Partial<FieldReport>, status: 'RESOLVED' as FieldReportStatus }
      : r
    ));
  };

  const addCorrectiveAction = (action: Omit<CorrectiveAction, 'id' | 'status' | 'createdAt'>) => {
    const full = { ...action, status: 'OPEN' as const, createdAt: new Date().toISOString() };
    if (isFirebaseConfigured) {
      addCorrectiveActionDoc(full).catch((err) => console.error('addCorrectiveAction failed:', err));
      return;
    }
    setCorrectiveActions(prev => [{ ...full, id: `ca-${Date.now()}` }, ...prev]);
  };

  // Step 1: the assignee marks it done — never the creator, and only
  // while still OPEN (see firestore.rules).
  const markCorrectiveActionDone = (id: string, note: string) => {
    const patch = { status: 'DONE', completedAt: new Date().toISOString(), completionNote: note.trim() };
    if (isFirebaseConfigured) {
      updateCorrectiveActionDoc(id, patch).catch((err) => console.error('markCorrectiveActionDone failed:', err));
      return;
    }
    setCorrectiveActions(prev => prev.map(a => a.id === id
      ? { ...a, ...patch as Partial<CorrectiveAction>, status: 'DONE' as CorrectiveActionStatus }
      : a
    ));
  };

  // Step 2a: the creator (verifier) is satisfied — closes it for good.
  const verifyCorrectiveAction = (id: string) => {
    const patch = { status: 'VERIFIED', verifiedAt: new Date().toISOString() };
    if (isFirebaseConfigured) {
      updateCorrectiveActionDoc(id, patch).catch((err) => console.error('verifyCorrectiveAction failed:', err));
      return;
    }
    setCorrectiveActions(prev => prev.map(a => a.id === id
      ? { ...a, ...patch as Partial<CorrectiveAction>, status: 'VERIFIED' as CorrectiveActionStatus }
      : a
    ));
  };

  // Step 2b: the creator isn't satisfied — sends it back to OPEN with a
  // reason, same reopen-for-another-try shape as a rejected Submission.
  // The assignee's own completedAt/completionNote from the rejected
  // attempt are left in place (not cleared) so the reason for the
  // rejection reads right alongside what was actually claimed as done.
  const reopenCorrectiveAction = (id: string, note: string) => {
    const patch = { status: 'OPEN', reopenedAt: new Date().toISOString(), reopenedNote: note.trim() };
    if (isFirebaseConfigured) {
      updateCorrectiveActionDoc(id, patch).catch((err) => console.error('reopenCorrectiveAction failed:', err));
      return;
    }
    setCorrectiveActions(prev => prev.map(a => a.id === id
      ? { ...a, ...patch as Partial<CorrectiveAction>, status: 'OPEN' as CorrectiveActionStatus }
      : a
    ));
  };

  const completeTraining = (userId: string, moduleId: string) => {
    if (isFirebaseConfigured) {
      completeTrainingDoc(moduleId, userId).catch((err) => console.error('completeTraining failed:', err));
      return;
    }
    setTrainings(prev => prev.map(t =>
      t.id === moduleId && !t.completedBy.includes(userId)
        ? { ...t, completedBy: [...t.completedBy, userId] }
        : t
    ));
  };

  // Soft-deleted entries (deleteSubmission above) stay in `submissions`
  // internally — every stamp/reject/resubmit/delete lookup by id above
  // still needs to find them — but nothing outside this file should ever
  // see one. Every queue, History list, and Admin's Activity tab reads
  // submissions through this, so there's exactly one place a deleted
  // entry gets filtered rather than every screen having to remember to.
  const visibleSubmissions = submissions.filter(s => !s.deletedAt);

  return {
    currentUser,
    isAuthResolving,
    storageError,
    outboxPendingCount,
    users,
    submissions: visibleSubmissions,
    olderHistory,
    checkSchedules,
    missedChecks,
    addCheckSchedule,
    updateCheckSchedule,
    deleteCheckSchedule,
    warnings,
    fieldReports,
    messages: visibleMessages,
    unreadChatCount,
    sendChatMessage,
    editChatMessage,
    deleteChatMessageForEveryone,
    hideChatMessagesForMe,
    markConversationRead,
    correctiveActions,
    trainings,
    sites: SITES,
    login,
    loginWithGoogle,
    loginByStaffCode,
    logout,
    addSubmission,
    deleteSubmission,
    addSignoffStamp,
    rejectSignoff,
    resubmitAfterRejection,
    addUser,
    updateUserRole,
    updateUserSite,
    updateUserAssignedSites,
    resetUserCredentials,
    setStaffIdentity,
    toggleUserActive,
    deleteUser,
    addWarning,
    addFieldReport,
    acknowledgeFieldReport,
    resolveFieldReport,
    addCorrectiveAction,
    markCorrectiveActionDone,
    verifyCorrectiveAction,
    reopenCorrectiveAction,
    completeTraining
  };
}
