// Firestore-backed replacement for the Admin Portal's user list, used only
// when Firebase is configured (see lib/firebase.ts). Docs are keyed by
// lowercased email so authService can look a profile up directly without
// a query. See authService.ts for how accounts actually get activated.

import { collection, doc, deleteDoc, deleteField, getDoc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';

interface FirestoreUserDoc {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  site: string;
  assignedSites?: string[] | 'ALL';
  isActive: boolean;
  uid: string | null;
  staffCode?: string;
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
          assignedSites: data.assignedSites,
          isActive: data.isActive,
          staffCode: data.staffCode,
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
  if (user.assignedSites) docData.assignedSites = user.assignedSites;
  await setDoc(doc(db, 'users', emailLower), docData);
}

export async function updateUserRoleDoc(email: string, role: UserRole): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  // Any admin can grant (or revoke) ADMIN on someone else now — the only
  // account this can never touch is the bootstrap super-admin, guarded in
  // useAppStore.ts (which never calls this for that email) and enforced
  // again server-side in firestore.rules.
  await updateDoc(doc(db, 'users', emailLower), { role });
}

export async function updateUserSiteDoc(email: string, site: string): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  await updateDoc(doc(db, 'users', emailLower), { site });
}

// null clears the override entirely (back to "Home Site only" — see
// siteScope.ts's sitesForScope()), via Firestore's deleteField() rather
// than writing null/undefined, so a since-renamed or deleted site never
// lingers in an old assignedSites array.
export async function updateUserAssignedSitesDoc(email: string, assignedSites: string[] | 'ALL' | null): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  await updateDoc(doc(db, 'users', emailLower), { assignedSites: assignedSites ?? deleteField() });
}

export async function toggleUserActiveDoc(email: string, isActive: boolean): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  await updateDoc(doc(db, 'users', emailLower), { isActive: !isActive });
}

// Permanently removes the Firestore profile — the person disappears from
// the Admin Portal and immediately loses access (their next login attempt
// finds no invite and no active profile). Also frees up their Staff ID: if
// they had one set (see setStaffIdentityDoc below), the staffCodes/{CODE}
// index entry pointing at them is deleted in the same batch, so that
// number stops being permanently unreusable and someone new can be handed
// it later. This only deletes Firestore records, not the underlying
// Firebase Auth account (the client SDK can't delete other users' Auth
// accounts without the Admin SDK/a Cloud Function) — see the note in
// AdminPortal.tsx's confirmation dialog. firestore.rules independently
// blocks both deletes for anyone but an admin, and blocks deleting the
// super-admin's own doc.
export async function deleteUserDoc(email: string, staffCode?: string): Promise<void> {
  if (!db) return;
  const emailLower = email.trim().toLowerCase();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', emailLower));
  if (staffCode) batch.delete(doc(db, 'staffCodes', staffCode.trim().toUpperCase()));
  await batch.commit();
}

export type SetStaffIdentityResult = { ok: true } | { ok: false; error: 'staffcode-taken' | 'not-configured' };

// Sets (or replaces) a user's Scan-to-Job Staff ID. No PIN — the code
// itself is the credential, since it's only ever handed out by an Admin
// in the first place. Writes two places: the staffCodes/{CODE} lookup
// index (see authService.ts's loginByStaffCode for why that index exists
// at all) and the staffCode field on their own users/{email} doc. Neither
// write is atomic with the other (no transaction — this app's Firestore
// usage elsewhere doesn't use them either, see the email-migration
// comment in functions/src/index.ts's adminResetCredentials for the same
// tradeoff), but a half-finished attempt just means the admin retries; it
// can't lock anyone out of an account that was already working.
export async function setStaffIdentityDoc(
  email: string,
  staffCode: string,
  previousStaffCode?: string
): Promise<SetStaffIdentityResult> {
  if (!db) return { ok: false, error: 'not-configured' };
  const emailLower = email.trim().toLowerCase();
  const codeUpper = staffCode.trim().toUpperCase();

  const mapRef = doc(db, 'staffCodes', codeUpper);
  const mapSnap = await getDoc(mapRef);
  if (mapSnap.exists() && (mapSnap.data() as { email?: string }).email !== emailLower) {
    return { ok: false, error: 'staffcode-taken' };
  }

  await setDoc(mapRef, { email: emailLower });
  await updateDoc(doc(db, 'users', emailLower), { staffCode: codeUpper });

  if (previousStaffCode && previousStaffCode.trim().toUpperCase() !== codeUpper) {
    // Best-effort cleanup of the old index entry — leaving it behind would
    // just be dead weight (it no longer matches anyone's staffCode field),
    // not a security hole, so a failure here isn't worth surfacing.
    await deleteDoc(doc(db, 'staffCodes', previousStaffCode.trim().toUpperCase())).catch(() => {});
  }

  return { ok: true };
}
