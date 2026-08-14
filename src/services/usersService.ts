// Firestore-backed replacement for the Admin Portal's user list, used only
// when Firebase is configured (see lib/firebase.ts). Docs are keyed by
// lowercased email so authService can look a profile up directly without
// a query. See authService.ts for how accounts actually get activated.

import { collection, doc, deleteDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';
import { SUPER_ADMIN_EMAIL } from './authService';

interface FirestoreUserDoc {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  site: string;
  isActive: boolean;
  uid: string | null;
}

// Live-subscribes to the users collection. Returns an unsubscribe function.
export function subscribeUsers(onChange: (users: User[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users: User[] = snap.docs.map((d) => {
        const data = d.data() as FirestoreUserDoc;
        return {
          id: data.uid || d.id, // fall back to the email-based doc id pre-activation
          name: data.name,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          role: data.role,
          site: data.site,
          isActive: data.isActive,
        };
      });
      onChange(users);
    },
    (err) => {
      // Surface this instead of letting the Personnel list silently stay
      // empty forever — Firestore treats permission-denied as terminal
      // for a given listener rather than something it retries on its own.
      console.error('subscribeUsers failed:', err);
    }
  );
}

// Creates an "invite": a profile with a role, but no linked Auth account
// yet. The person activates it themselves on first login (see
// authService.loginOrRegister).
export async function inviteUser(user: Omit<User, 'id' | 'isActive'>): Promise<void> {
  if (!db) return;
  const emailLower = user.email.trim().toLowerCase();
  const docData: FirestoreUserDoc = {
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: emailLower,
    role: user.role,
    site: user.site,
    isActive: true,
    uid: null,
  };
  await setDoc(doc(db, 'users', emailLower), docData);
}

export async function updateUserRoleDoc(email: string, role: UserRole): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  // Mirrors the client-side guard in useAppStore: the ADMIN role can only
  // ever belong to the designated super-admin account. Firestore security
  // rules should enforce this too — see firestore.rules.
  if (role === 'ADMIN' && emailLower !== SUPER_ADMIN_EMAIL) return;
  await updateDoc(doc(db, 'users', emailLower), { role });
}

export async function toggleUserActiveDoc(email: string, isActive: boolean): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  await updateDoc(doc(db, 'users', emailLower), { isActive: !isActive });
}

// Permanently removes the Firestore profile — the person disappears from
// the Admin Portal and immediately loses access (their next login attempt
// finds no invite and no active profile). This only deletes the Firestore
// record, not the underlying Firebase Auth account (the client SDK can't
// delete other users' Auth accounts without the Admin SDK/a Cloud
// Function) — see the note in AdminPortal.tsx's confirmation dialog.
// firestore.rules independently blocks this for anyone but the
// super-admin, and blocks deleting the super-admin's own doc.
export async function deleteUserDoc(email: string): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  await deleteDoc(doc(db, 'users', emailLower));
}
