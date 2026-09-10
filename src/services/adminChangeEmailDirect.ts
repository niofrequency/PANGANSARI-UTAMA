// Client-only way for an Admin to change a DIFFERENT user's login email —
// no Cloud Function, no deploy, no CORS. Password resets still go through
// adminResetCredentials.ts / the Cloud Function of the same name
// unchanged; this only covers email.
//
// Same throwaway-secondary-Firebase-App trick createStaffAccountDirect
// (adminCreateAccount.ts) uses for account creation, adapted here to sign
// in to an EXISTING account instead of creating a new one.
//
// The catch: Firebase Auth's client SDK can only ever change the email of
// whichever user is CURRENTLY signed in on a given Auth instance — there's
// no client-side way to force another account's email without knowing its
// password. The Cloud Function sidesteps this with the Admin SDK (a real
// server-side override). This can't: it signs in AS the target person on a
// throwaway secondary app (the admin's own session, from lib/firebase.ts,
// is never touched), which only works if the admin actually supplies that
// person's CURRENT password. That's not a bug to fix — it's the security
// boundary Firebase Auth enforces; there's no client-only way around it.
// Best suited to "I know their current login," not general account
// recovery.
//
// Because the same Firebase Auth uid is kept throughout (just signed in,
// not recreated), every submission/warning/report this person ever filed
// stays correctly attributed to them afterward — unlike a
// delete-and-recreate approach, which would mint a new uid and silently
// orphan their history.

import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updateEmail, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { firebaseConfig, db } from '../lib/firebase';

export interface ChangeEmailDirectParams {
  currentEmail: string;
  // The person's existing password — required to sign in as them at all;
  // see the module comment above for why this can't be avoided client-side.
  currentPassword: string;
  newEmail: string;
}

export type ChangeEmailDirectResult =
  | { ok: true }
  | { ok: false; error: 'wrong-password' | 'already-exists' | 'invalid-argument' | 'not-configured' | 'unknown' };

export async function changeUserEmailDirect(
  params: ChangeEmailDirectParams
): Promise<ChangeEmailDirectResult> {
  if (!db) return { ok: false, error: 'not-configured' };

  const currentEmailLower = params.currentEmail.trim().toLowerCase();
  const newEmailLower = params.newEmail.trim().toLowerCase();
  if (!newEmailLower) return { ok: false, error: 'invalid-argument' };
  if (newEmailLower === currentEmailLower) return { ok: false, error: 'invalid-argument' };

  // A uniquely-named secondary app per call, exactly like
  // createStaffAccountDirect — isolated from the admin's own primary
  // session (app/auth from lib/firebase.ts), which is never touched.
  const secondaryApp: FirebaseApp = initializeApp(firebaseConfig, `staff-email-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    let uid: string;
    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, currentEmailLower, params.currentPassword);
      uid = cred.user.uid;
      await updateEmail(cred.user, newEmailLower);
    } catch (err: any) {
      console.error('changeUserEmailDirect: sign-in/updateEmail failed:', err?.code, err?.message);
      if (['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-email'].includes(err?.code)) {
        return { ok: false, error: 'wrong-password' };
      }
      if (err?.code === 'auth/email-already-in-use') {
        return { ok: false, error: 'already-exists' };
      }
      return { ok: false, error: 'unknown' };
    } finally {
      await signOut(secondaryAuth).catch(() => {});
    }

    // Firestore profiles are keyed by email (see authService.ts), so
    // changing it means migrating the doc to a new doc id, not just
    // editing a field — same as the Cloud Function does. The uid inside it
    // is untouched, so history (submissions/warnings/reports) stays
    // correctly attributed.
    const oldRef = doc(db, 'users', currentEmailLower);
    const oldSnap = await getDoc(oldRef);
    const oldData = oldSnap.exists() ? oldSnap.data() : {};
    try {
      await setDoc(doc(db, 'users', newEmailLower), { ...oldData, email: newEmailLower, uid });
      await deleteDoc(oldRef);
    } catch (err) {
      console.error('changeUserEmailDirect: Firestore migration failed:', err);
      return { ok: false, error: 'unknown' };
    }

    // staffCodes/{CODE} points at an email, not a uid — repoint it too if
    // this person has a Staff ID set. Best-effort: the Auth account and
    // profile are already fully migrated without this, so a failure here
    // isn't worth reporting as the whole change having failed.
    const staffCode = (oldData as { staffCode?: string }).staffCode;
    if (staffCode) {
      await setDoc(doc(db, 'staffCodes', staffCode), { email: newEmailLower }).catch((err) =>
        console.error('changeUserEmailDirect: staffCodes repoint failed:', err)
      );
    }

    return { ok: true };
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}
