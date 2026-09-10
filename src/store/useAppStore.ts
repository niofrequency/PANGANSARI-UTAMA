import { useState, useEffect } from 'react';
import { User, Submission, UserRole, Site, Warning, TrainingModule, FieldReport, FieldReportStatus } from '../types';
import { INITIAL_USERS, INITIAL_SUBMISSIONS, INITIAL_WARNINGS, INITIAL_FIELD_REPORTS, SITES, TRAINING_MODULES } from '../data/mockData';
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
import { changeUserEmailDirect } from '../services/adminChangeEmailDirect';
import { isValidStaffCode } from '../utils/staffCode';
import { SIGNOFF_CHAINS } from '../data/opsLogsCatalog';

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
    const saved = localStorage.getItem('psu_submissions_v4');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('psu_warnings_v4');
    return saved ? JSON.parse(saved) : INITIAL_WARNINGS;
  });

  const [fieldReports, setFieldReports] = useState<FieldReport[]>(() => {
    const saved = localStorage.getItem('psu_field_reports_v1');
    return saved ? JSON.parse(saved) : INITIAL_FIELD_REPORTS;
  });

  const [trainings, setTrainings] = useState<TrainingModule[]>(() => {
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
    safeSetItem('psu_submissions_v4', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    safeSetItem('psu_warnings_v4', JSON.stringify(warnings));
  }, [warnings]);

  useEffect(() => {
    safeSetItem('psu_field_reports_v1', JSON.stringify(fieldReports));
  }, [fieldReports]);

  useEffect(() => {
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
  // ever hands one out). See authService.ts's loginByStaffCode for why
  // this deliberately never touches Firebase Auth.
  const loginByStaffCode = async (
    staffCode: string
  ): Promise<{ ok: boolean; error?: 'unknown-id' | 'inactive' }> => {
    const codeUpper = staffCode.trim().toUpperCase();

    if (isFirebaseConfigured) {
      const result = await loginByStaffCodeService(codeUpper);
      if (!result.ok) return result;
      const p = result.profile;
      setPinSessionActive(true);
      setCurrentUser({
        id: p.uid || codeUpper,
        name: p.name,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email,
        role: p.role,
        site: p.site,
        isActive: p.isActive,
        staffCode: p.staffCode,
      });
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
    if (isFirebaseConfigured) {
      firebaseLogout();
      if (wasPinSession) setCurrentUser(null);
      return;
    }
    setCurrentUser(null);
  };

  const addSubmission = (submission: Omit<Submission, 'id'>) => {
    const newSubmission = { ...submission, id: `s-${Date.now()}` };
    setSubmissions(prev => [newSubmission, ...prev]);
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
    setSubmissions(prev => prev.map(s => {
      if (s.id !== submissionId) return s;
      const chain = s.type in SIGNOFF_CHAINS ? SIGNOFF_CHAINS[s.type as keyof typeof SIGNOFF_CHAINS] : undefined;
      const stamp = { userId: currentUser.id, name: currentUser.name, at: new Date().toISOString() };
      const nextSignoff = { ...s.meta?.signoff, [step]: stamp };
      const isFinalStep = chain ? chain[chain.length - 1] === step : false;
      return {
        ...s,
        meta: { ...s.meta, signoff: nextSignoff },
        status: isFinalStep ? 'APPROVED' : s.status,
      };
    }));
  };

  // Sends a submission back to whoever filed it instead of advancing the
  // chain — same "someone has to decide" moment a plain Reject always
  // was, just with the sign-off chain's partial progress left in place
  // (as a record of how far it got) until it's actually resubmitted.
  const rejectSignoff = (submissionId: string, reason: string) => {
    setSubmissions(prev => prev.map(s => s.id === submissionId
      ? { ...s, status: 'REJECTED' as const, rejectionReason: reason.trim() }
      : s
    ));
  };

  // The submitter fixes and resubmits the SAME record — not a new one —
  // so its original id/timestamp/history stay intact. Restarts the chain
  // from the first step: whatever had already been stamped before this
  // doesn't carry over, since it was stamped against the old content.
  const resubmitAfterRejection = (submissionId: string, updates: Partial<Pick<Submission, 'items' | 'meta' | 'score'>>) => {
    if (!currentUser) return;
    setSubmissions(prev => prev.map(s => {
      if (s.id !== submissionId) return s;
      const draftedBy = { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() };
      return {
        ...s,
        ...updates,
        status: 'PENDING' as const,
        rejectionReason: undefined,
        meta: { ...s.meta, ...updates.meta, signoff: { draftedBy } },
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
      id: `u-${Date.now()}`,
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

  // Admin changes a user's email WITHOUT the Cloud Function — client-only,
  // via changeUserEmailDirect (adminChangeEmailDirect.ts): briefly signs in
  // AS the target person on a throwaway secondary Auth session to call
  // Firebase Auth's own updateEmail, which is why it needs their CURRENT
  // password (there's no client-side way around that — see that file's
  // comment). Firebase mode only.
  const changeUserEmail = async (
    userId: string,
    currentPassword: string,
    newEmail: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { ok: false, error: 'not-configured' };
    }
    const target = users.find(u => u.id === userId);
    if (!target) return { ok: false, error: 'unknown' };
    const result = await changeUserEmailDirect({
      currentEmail: target.email,
      currentPassword,
      newEmail,
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
    const newWarning = { ...warning, id: `w-${Date.now()}` };
    setWarnings(prev => [newWarning, ...prev]);
  };

  const addFieldReport = (report: Omit<FieldReport, 'id' | 'status'>) => {
    const newReport: FieldReport = { ...report, id: `fr-${Date.now()}`, status: 'OPEN' };
    setFieldReports(prev => [newReport, ...prev]);
  };

  // "Seen, working on it" — doesn't require a note, unlike resolving.
  const acknowledgeFieldReport = (id: string) => {
    if (!currentUser) return;
    setFieldReports(prev => prev.map(r => r.id === id
      ? { ...r, status: 'ACKNOWLEDGED' as FieldReportStatus, acknowledgedBy: currentUser.name, acknowledgedAt: new Date().toISOString() }
      : r
    ));
  };

  // "Fixed" — the note is required so whoever filed the report actually
  // sees what was done about it, not just a status flip.
  const resolveFieldReport = (id: string, note: string) => {
    if (!currentUser) return;
    setFieldReports(prev => prev.map(r => r.id === id
      ? { ...r, status: 'RESOLVED' as FieldReportStatus, resolvedBy: currentUser.name, resolvedAt: new Date().toISOString(), resolutionNote: note.trim() }
      : r
    ));
  };

  const completeTraining = (userId: string, moduleId: string) => {
    setTrainings(prev => prev.map(t => 
      t.id === moduleId && !t.completedBy.includes(userId) 
        ? { ...t, completedBy: [...t.completedBy, userId] } 
        : t
    ));
  };

  return {
    currentUser,
    isAuthResolving,
    storageError,
    users,
    submissions,
    warnings,
    fieldReports,
    trainings,
    sites: SITES,
    login,
    loginWithGoogle,
    loginByStaffCode,
    logout,
    addSubmission,
    addSignoffStamp,
    rejectSignoff,
    resubmitAfterRejection,
    addUser,
    updateUserRole,
    updateUserSite,
    updateUserAssignedSites,
    resetUserCredentials,
    changeUserEmail,
    setStaffIdentity,
    toggleUserActive,
    deleteUser,
    addWarning,
    addFieldReport,
    acknowledgeFieldReport,
    resolveFieldReport,
    completeTraining
  };
}
