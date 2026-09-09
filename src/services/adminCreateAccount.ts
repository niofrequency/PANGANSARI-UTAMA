// Creates a fully-working staff login directly from the browser — no Cloud
// Function required. That matters because Cloud Functions need the Blaze
// (pay-as-you-go) billing plan and a separate `firebase deploy --only
// functions` step; if either hasn't happened, the old approach
// (createStaffAccount in functions/src/index.ts) silently failed and the
// Admin Portal fell back to an invite-only profile — a profile with no
// real password, which is exactly the "I made the account but can't log
// into it" trap this replaces.
//
// The one problem client-side account creation normally has: calling
// createUserWithEmailAndPassword while signed in AS the admin immediately
// swaps the browser's current session to the newly created user — signing
// the admin out of their own account. That's avoided here by creating the
// new account on a throwaway SECOND Firebase App instance; the admin's
// primary session (app/auth from lib/firebase.ts) is never touched.
//
// The Firestore profile write still goes through the primary, already
// signed-in-as-admin `db` — firestore.rules' isAdmin() branch already
// allows any admin to create/update another user's doc, including
// granting the ADMIN role itself (the one exception is the original
// bootstrap account, which stays untouchable by anyone but itself), so no
// rule changes are needed for this.

import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseConfig, db } from '../lib/firebase';
import { UserRole } from '../types';

export interface CreateStaffAccountParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  site: string;
  // Optional Scan-to-Job Staff ID, assignable right at creation time (see
  // AdminPortal.tsx's Add Staff form) instead of only afterward via
  // setStaffIdentity. No PIN — the code itself is the credential.
  staffCode?: string;
}

export type CreateStaffAccountResult =
  | { ok: true }
  | { ok: false; error: 'already-exists' | 'staffcode-taken' | 'invalid-argument' | 'not-configured' | 'unknown' };

// Same reasoning as writeProfileWithRetry in authService.ts: covers a
// transient Firestore hiccup right after account creation without giving
// up on the very first blip.
async function setDocWithRetry(write: () => Promise<void>): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (err) {
    console.error('createStaffAccountDirect: profile write failed, retrying once:', err);
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await write();
      return true;
    } catch (err2) {
      console.error('createStaffAccountDirect: profile write failed again after retry:', err2);
      return false;
    }
  }
}

export async function createStaffAccountDirect(
  params: CreateStaffAccountParams
): Promise<CreateStaffAccountResult> {
  if (!db) return { ok: false, error: 'not-configured' };

  const emailLower = params.email.trim().toLowerCase();
  const fn = params.firstName.trim();
  const ln = (params.lastName || '').trim();
  if (!emailLower || !fn || !params.role || !params.site) {
    return { ok: false, error: 'invalid-argument' };
  }
  if (params.password.length < 6) {
    return { ok: false, error: 'invalid-argument' };
  }

  const staffCode = params.staffCode?.trim();
  if (staffCode) {
    const mapSnap = await getDoc(doc(db, 'staffCodes', staffCode));
    if (mapSnap.exists()) {
      return { ok: false, error: 'staffcode-taken' };
    }
  }

  // A uniquely-named secondary app per call — so two "Add Staff" calls
  // that somehow overlap each get their own isolated Auth instance,
  // instead of racing each other or the admin's primary session.
  const secondaryApp: FirebaseApp = initializeApp(firebaseConfig, `staff-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailLower, params.password);
      uid = cred.user.uid;
    } catch (err: any) {
      console.error('createStaffAccountDirect: createUser failed:', err?.code, err?.message);
      if (err?.code === 'auth/email-already-in-use') {
        return { ok: false, error: 'already-exists' };
      }
      if (err?.code === 'auth/weak-password' || err?.code === 'auth/invalid-email') {
        return { ok: false, error: 'invalid-argument' };
      }
      return { ok: false, error: 'unknown' };
    }

    // Done with the throwaway session right away — nothing past this
    // point touches it again.
    await signOut(secondaryAuth).catch(() => {});

    const profile = {
      name: `${fn} ${ln}`.trim(),
      firstName: fn,
      lastName: ln,
      email: emailLower,
      role: params.role,
      site: params.site,
      isActive: true,
      uid,
      ...(staffCode ? { staffCode } : {}),
    };
    const wrote = await setDocWithRetry(() => setDoc(doc(db, 'users', emailLower), profile));
    if (!wrote) {
      // The Auth account exists but its profile doesn't — the same
      // orphaned state authService.ts's self-signup flow already knows how
      // to recover from (reclaimAbandonedSignup / the "email already in
      // use" fallback), so the person isn't permanently stuck even though
      // this specific attempt is reported as failed.
      return { ok: false, error: 'unknown' };
    }
    if (staffCode) {
      // Best-effort: the account and profile are already fully working
      // without this, so a failure here isn't worth reporting as the
      // whole call having failed — the admin can always add the Staff ID
      // afterward from the per-user "Staff ID" button instead.
      await setDoc(doc(db, 'staffCodes', staffCode), { email: emailLower }).catch((err) =>
        console.error('createStaffAccountDirect: staffCodes index write failed:', err)
      );
    }
    return { ok: true };
  } finally {
    // Always clean up the temporary app, success or failure.
    await deleteApp(secondaryApp).catch(() => {});
  }
}
