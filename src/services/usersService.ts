// Firestore-backed replacement for the Admin Portal's user list, used only
// when Firebase is configured (see lib/firebase.ts). Docs are keyed by
// lowercased email so authService can look a profile up directly without
// a query. See authService.ts for how accounts actually get activated.

import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';
import { SUPER_ADMIN_EMAIL } from './authService';

interface FirestoreUserDoc {
  name: string;
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
  return onSnapshot(collection(db, 'users'), (snap) => {
    const users: User[] = snap.docs.map((d) => {
      const data = d.data() as FirestoreUserDoc;
      return {
        id: data.uid || d.id, // fall back to the email-based doc id pre-activation
        name: data.name,
        email: data.email,
        role: data.role,
        site: data.site,
        isActive: data.isActive,
      };
    });
    onChange(users);
  });
}

// Creates an "invite": a profile with a role, but no linked Auth account
// yet. The person activates it themselves on first login (see
// authService.loginOrRegister).
export async function inviteUser(user: Omit<User, 'id' | 'isActive'>): Promise<void> {
  if (!db) return;
  const emailLower = user.email.trim().toLowerCase();
  const docData: FirestoreUserDoc = {
    name: user.name,
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
