import { useState, useEffect } from 'react';
import { User, Submission, UserRole, Site, Warning, TrainingModule } from '../types';
import { INITIAL_USERS, INITIAL_SUBMISSIONS, SITES, TRAINING_MODULES } from '../data/mockData';
import { isFirebaseConfigured } from '../lib/firebase';
import { loginOrRegister, loginWithGoogle as loginWithGoogleService, logout as firebaseLogout, watchAuthAndProfile, SUPER_ADMIN_EMAIL } from '../services/authService';
import { subscribeUsers, inviteUser, updateUserRoleDoc, toggleUserActiveDoc } from '../services/usersService';

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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isFirebaseConfigured) return null; // resolved async by watchAuthAndProfile below
    const saved = localStorage.getItem('psu_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    if (isFirebaseConfigured) return []; // populated by subscribeUsers below
    const saved = localStorage.getItem('psu_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('psu_submissions');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('psu_warnings');
    return saved ? JSON.parse(saved) : [];
  });

  const [trainings, setTrainings] = useState<TrainingModule[]>(() => {
    const saved = localStorage.getItem('psu_trainings');
    return saved ? JSON.parse(saved) : TRAINING_MODULES;
  });

  // --- Firebase mode: live subscriptions ---
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubAuth = watchAuthAndProfile(setCurrentUser);
    const unsubUsers = subscribeUsers(setUsers);
    return () => {
      unsubAuth();
      unsubUsers();
    };
  }, []);

  // --- Demo mode: persist everything to localStorage ---
  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('psu_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('psu_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('psu_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('psu_warnings', JSON.stringify(warnings));
  }, [warnings]);

  useEffect(() => {
    localStorage.setItem('psu_trainings', JSON.stringify(trainings));
  }, [trainings]);

  const login = async (email: string, password: string): Promise<string | null> => {
    if (isFirebaseConfigured) {
      const result = await loginOrRegister(email, password);
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
    addWarning,
    completeTraining
  };
}
