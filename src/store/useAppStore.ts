import { useState, useEffect } from 'react';
import { User, Submission, UserRole, Site, Warning, TrainingModule } from '../types';
import { INITIAL_USERS, INITIAL_SUBMISSIONS, SITES, TRAINING_MODULES } from '../data/mockData';
import { isFirebaseConfigured } from '../lib/firebase';
import { loginOrRegister, loginWithGoogle as loginWithGoogleService, logout as firebaseLogout, watchAuthAndProfile, SUPER_ADMIN_EMAIL } from '../services/authService';
import { subscribeUsers, inviteUser, updateUserRoleDoc, toggleUserActiveDoc, deleteUserDoc } from '../services/usersService';

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
//    firestore.rules). Submissions/warnings/trainings still use
//    localStorage in this version — see FIREBASE_SETUP.md for notes on
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
  // alone doesn't clear what's already saved on a given device. Do not
  // change these key names again without a good reason; every bump wipes
  // local data for anyone still on localStorage (demo) mode.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isFirebaseConfigured) return null; // resolved async by watchAuthAndProfile below
    const saved = localStorage.getItem('psu_current_user_v2');
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

  const [users, setUsers] = useState<User[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeUsers below
    const saved = localStorage.getItem('psu_users_v2');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('psu_submissions_v2');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('psu_warnings_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [trainings, setTrainings] = useState<TrainingModule[]>(() => {
    const saved = localStorage.getItem('psu_trainings_v2');
    return saved ? JSON.parse(saved) : TRAINING_MODULES;
  });

  // One-time cleanup: remove the old (pre-v2) keys so they don't sit
  // around unused forever in people's browsers.
  useEffect(() => {
    ['psu_current_user', 'psu_users', 'psu_submissions', 'psu_warnings', 'psu_trainings'].forEach(
      (key) => localStorage.removeItem(key)
    );
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
    if (!currentUser) {
      setUsers([]);
      return;
    }
    const unsubUsers = subscribeUsers(setUsers);
    return () => unsubUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured, currentUser?.id]);

  // --- Demo mode: persist everything to localStorage ---
  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('psu_current_user_v2', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('psu_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('psu_submissions_v2', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('psu_warnings_v2', JSON.stringify(warnings));
  }, [warnings]);

  useEffect(() => {
    localStorage.setItem('psu_trainings_v2', JSON.stringify(trainings));
  }, [trainings]);

  const login = async (email: string, password: string, firstName?: string, lastName?: string): Promise<string | null> => {
    if (isFirebaseConfigured) {
      const result = await loginOrRegister(email, password, firstName, lastName);
      // currentUser is set by the watchAuthAndProfile subscription once
      // Firebase Auth's state updates — no need to set it here.
      return result.ok ? null : result.error;
    }

    // Demo mode: same behavior as before Firebase was wired in.
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return 'invalid';
    if (!user.isActive) return 'inactive';
    const effectiveUser =
      user.role === 'ADMIN' && user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
        ? { ...user, role: 'HOUSEKEEPER' as UserRole }
        : user;
    setCurrentUser(effectiveUser);
    return null;
  };

  // Google Sign-In only makes sense in Firebase mode — there's no Google
  // account concept in the localStorage demo. Callers should check
  // isFirebaseConfigured before showing the button at all (Auth.tsx does).
  const loginWithGoogle = async (): Promise<string | null> => {
    if (!isFirebaseConfigured) return 'invalid';
    const result = await loginWithGoogleService();
    return result.ok ? null : result.error;
  };

  const logout = () => {
    if (isFirebaseConfigured) {
      firebaseLogout();
      return;
    }
    setCurrentUser(null);
  };

  const addSubmission = (submission: Omit<Submission, 'id'>) => {
    const newSubmission = { ...submission, id: `s-${Date.now()}` };
    setSubmissions(prev => [newSubmission, ...prev]);
  };

  const updateSubmissionStatus = (id: string, status: Submission['status'], reason?: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status, rejectionReason: reason } : s));
  };

  const addUser = (user: Omit<User, 'id' | 'isActive'>) => {
    if (isFirebaseConfigured) {
      inviteUser(user);
      return;
    }
    const newUser: User = { ...user, id: `u-${Date.now()}`, isActive: true };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    if (isFirebaseConfigured) {
      const target = users.find(u => u.id === userId);
      if (target) updateUserRoleDoc(target.email, role);
      return;
    }
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      if (role === 'ADMIN' && u.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return u;
      return { ...u, role };
    }));
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
      deleteUserDoc(target.email);
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addWarning = (warning: Omit<Warning, 'id'>) => {
    const newWarning = { ...warning, id: `w-${Date.now()}` };
    setWarnings(prev => [newWarning, ...prev]);
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
    users,
    submissions,
    warnings,
    trainings,
    sites: SITES,
    login,
    loginWithGoogle,
    logout,
    addSubmission,
    updateSubmissionStatus,
    addUser,
    updateUserRole,
    toggleUserActive,
    deleteUser,
    addWarning,
    completeTraining
  };
}
