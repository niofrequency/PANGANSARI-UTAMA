// Wraps Firebase Auth with an "invite-based" registration flow, since a
// pure client + Vercel app has no server to run the Firebase Admin SDK
// (which is normally how you'd pre-create staff accounts).
//
// How it works instead:
//   1. The Admin Portal writes a Firestore doc to `users/{email}` with the
//      person's name/role/site and `uid: null` — an "invite".
//   2. The first time that person logs in with their email + a password
//      they choose, we detect the invite (doc exists, uid is null) and
//      call createUserWithEmailAndPassword to actually create their
//      Firebase Auth account, then link it by writing their uid back onto
//      the doc.
//   3. Every login after that is a normal signInWithEmailAndPassword.
//
// The one bootstrap exception: SUPER_ADMIN_EMAIL can self-register with no
// pre-existing invite, since otherwise nobody could ever create the first
// admin account. Every other email needs an admin-created invite first.
//
// IMPORTANT: this file only enforces the invite rule in the client. The
// same rule is mirrored in firestore.rules so it's enforced server-side
// too — see that file and FIREBASE_SETUP.md before going live.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'mpigome44@gmail.com';

export type LoginResult =
  | { ok: true; profile: FirestoreUserProfile }
  | { ok: false; error: 'invalid' | 'inactive' | 'no-invite' | 'popup-closed' };

interface FirestoreUserProfile {
  name: string;
  email: string;
  role: UserRole;
  site: string;
  isActive: boolean;
  uid: string | null;
}

function userDocRef(email: string) {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'users', email.trim().toLowerCase());
}

export async function loginOrRegister(email: string, password: string): Promise<LoginResult> {
  if (!auth || !db) return { ok: false, error: 'invalid' };
  const emailLower = email.trim().toLowerCase();
  const ref = userDocRef(emailLower);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as FirestoreUserProfile;
    if (data.isActive === false) return { ok: false, error: 'inactive' };

    if (data.uid) {
      // Already activated — normal sign-in.
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { ok: true, profile: data };
      } catch {
        return { ok: false, error: 'invalid' };
      }
    } else {
      // Invited but never logged in yet: this login *creates* the account,
      // using whatever password they just typed.
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateDoc(ref, { uid: cred.user.uid });
        return { ok: true, profile: { ...data, uid: cred.user.uid } };
      } catch {
        return { ok: false, error: 'invalid' };
      }
    }
  }

  if (emailLower === SUPER_ADMIN_EMAIL) {
    // Bootstrap path: no invite exists yet because nobody could have
    // created one. Create both the Auth account and its Firestore profile.
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile: FirestoreUserProfile = {
        name: 'Admin',
        email: emailLower,
        role: 'ADMIN',
        site: '',
        isActive: true,
        uid: cred.user.uid,
      };
      await setDoc(ref, profile);
      return { ok: true, profile };
    } catch {
      // The Auth account may already exist from an earlier bootstrap whose
      // Firestore doc got deleted. Fall back to a normal sign-in and
      // re-create the profile doc if that succeeds.
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const profile: FirestoreUserProfile = {
          name: 'Admin',
          email: emailLower,
          role: 'ADMIN',
          site: '',
          isActive: true,
          uid: cred.user.uid,
        };
        await setDoc(ref, profile);
        return { ok: true, profile };
      } catch {
        return { ok: false, error: 'invalid' };
      }
    }
  }

  return { ok: false, error: 'no-invite' };
}

// Google Sign-In, using the same invite-based activation rule as email
// login: signing in with Google only succeeds if an admin already created
// an invite for that Google account's email (or it's the bootstrap
// super-admin). This keeps "anyone with a Google account can sign in"
// from bypassing the same access control email/password login has.
export async function loginWithGoogle(): Promise<LoginResult> {
  if (!auth || !db) return { ok: false, error: 'invalid' };

  let firebaseUser;
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    firebaseUser = cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return { ok: false, error: 'popup-closed' };
    }
    return { ok: false, error: 'invalid' };
  }

  const emailLower = (firebaseUser.email || '').toLowerCase();
  if (!emailLower) {
    await signOut(auth);
    return { ok: false, error: 'invalid' };
  }

  const ref = userDocRef(emailLower);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as FirestoreUserProfile;
    if (data.isActive === false) {
      await signOut(auth);
      return { ok: false, error: 'inactive' };
    }
    if (!data.uid) {
      // Invited but never activated: this Google sign-in activates it.
      await updateDoc(ref, { uid: firebaseUser.uid });
      return { ok: true, profile: { ...data, uid: firebaseUser.uid } };
    }
    return { ok: true, profile: data };
  }

  if (emailLower === SUPER_ADMIN_EMAIL) {
    const profile: FirestoreUserProfile = {
      name: firebaseUser.displayName || 'Admin',
      email: emailLower,
      role: 'ADMIN',
      site: '',
      isActive: true,
      uid: firebaseUser.uid,
    };
    await setDoc(ref, profile);
    return { ok: true, profile };
  }

  // No invite for this account — don't leave them signed into Firebase
  // Auth with nothing to show for it.
  await signOut(auth);
  return { ok: false, error: 'no-invite' };
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

// Restores a session on page reload and keeps the current user's profile
// (role, active status, etc.) live — so if an admin changes someone's role
// or deactivates them while they're logged in, it takes effect immediately
// without needing a manual refresh.
export function watchAuthAndProfile(
  onChange: (user: User | null) => void
): () => void {
  if (!auth || !db) {
    onChange(null);
    return () => {};
  }

  let unsubProfile: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }
    if (!firebaseUser || !firebaseUser.email) {
      onChange(null);
      return;
    }
    const ref = userDocRef(firebaseUser.email);
    unsubProfile = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = snap.data() as FirestoreUserProfile;
      if (data.isActive === false) {
        onChange(null);
        logout();
        return;
      }
      onChange({
        id: firebaseUser.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        site: data.site,
        isActive: data.isActive,
      });
    });
  });

  return () => {
    unsubAuth();
    if (unsubProfile) unsubProfile();
  };
}
