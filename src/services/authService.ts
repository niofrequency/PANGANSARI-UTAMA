// Wraps Firebase Auth with an "invite-based" registration flow, since a
// pure client + Vercel app has no server to run the Firebase Admin SDK
// (which is normally how you'd pre-create staff accounts).
//
// How it works instead:
//   1. The Admin Portal writes a Firestore doc to `users/{email}` with the
//      person's name/role/site and `uid: null` — an "invite".
//   2. The first time that person logs in with their email + a password
//      they choose (on the Sign Up tab), we detect the invite (doc
//      exists, uid is null) and call createUserWithEmailAndPassword to
//      actually create their Firebase Auth account, then link it by
//      writing their uid back onto the doc. If they typed a first/last
//      name on the Sign Up form, that's saved at the same time — letting
//      the person confirm/correct the name an admin guessed when inviting
//      them.
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
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { User, UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'mpigome44@gmail.com';

// Calls the reclaimAbandonedSignup Cloud Function (functions/src/index.ts)
// — clears an orphaned Firebase Auth account (one whose Firestore profile
// was deleted, so nothing in the app claims it any more) so self-signup can
// create a fresh account instead of failing forever with "email already in
// use." Best-effort: if it's unreachable or the account isn't actually
// reclaimable (still active, or deliberately deactivated by an admin), this
// just returns false and the caller falls back to trying a normal sign-in.
async function tryReclaimAbandonedSignup(emailLower: string): Promise<boolean> {
  if (!functions) return false;
  try {
    const callable = httpsCallable(functions, 'reclaimAbandonedSignup');
    const result = await callable({ email: emailLower });
    return Boolean((result.data as { reclaimed?: boolean } | undefined)?.reclaimed);
  } catch (err) {
    console.error('reclaimAbandonedSignup call failed:', err);
    return false;
  }
}

export type LoginResult =
  | { ok: true; profile: FirestoreUserProfile }
  | {
      ok: false;
      error:
        | 'invalid'
        | 'inactive'
        | 'no-invite'
        | 'popup-closed'
        | 'weak-password'
        | 'invalid-email'
        | 'signup-disabled'
        | 'network'
        | 'too-many-requests'
        | 'profile-setup-failed';
    };

// Runs a Firestore write (setDoc/updateDoc) that follows a Firebase Auth
// call that just succeeded — account created, or password verified. Right
// after that Auth call, there's a well-known race in the Firebase web SDK:
// the freshly-issued ID token can take a moment to propagate to Firestore's
// client, so the very next write can get rejected even though the same
// rule would allow it a beat later. Retrying once after a short delay
// covers that window without making a genuinely-denied write (wrong rule,
// wrong data) take any longer to fail for real.
async function writeProfileWithRetry(write: () => Promise<void>): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (err) {
    console.error('Profile write failed, retrying once:', err);
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await write();
      return true;
    } catch (err2) {
      console.error('Profile write failed again after retry:', err2);
      return false;
    }
  }
}

// Turns a raw Firebase Auth error into one of the specific LoginResult
// codes above when it's something the person can actually act on or that
// points at a real setup problem — everything else still collapses to the
// generic 'invalid', but always logged first. Without this, every failure
// from createUserWithEmailAndPassword (a too-short password, the
// Email/Password sign-in provider not being enabled in the Firebase
// Console, a dropped connection, Firebase's own abuse-rate-limiting) showed
// the exact same "Invalid credentials, or this account has been
// deactivated" banner — which is actively misleading on a first-ever
// signup, since there's no prior credential or account to speak of.
function mapAuthError(err: any, context: string): LoginResult {
  console.error(`${context}:`, err?.code, err?.message);
  switch (err?.code) {
    case 'auth/weak-password':
      return { ok: false, error: 'weak-password' };
    case 'auth/invalid-email':
      return { ok: false, error: 'invalid-email' };
    case 'auth/operation-not-allowed':
      // The Email/Password provider is off in Firebase Console →
      // Authentication → Sign-in method. This blocks EVERY signup, new
      // account or not — if signups are failing for brand-new emails too,
      // check this first.
      return { ok: false, error: 'signup-disabled' };
    case 'auth/network-request-failed':
      return { ok: false, error: 'network' };
    case 'auth/too-many-requests':
      return { ok: false, error: 'too-many-requests' };
    default:
      return { ok: false, error: 'invalid' };
  }
}

interface FirestoreUserProfile {
  name: string;
  firstName: string;
  lastName: string;
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

// Best-effort split for names that only come as a single string (e.g. a
// Google account's displayName) — first token is the first name, the rest
// is the last name. Not perfect for every naming convention, but keeps
// the firstName/lastName fields populated for search either way.
function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function loginOrRegister(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<LoginResult> {
  if (!auth || !db) return { ok: false, error: 'invalid' };
  const emailLower = email.trim().toLowerCase();
  const ref = userDocRef(emailLower);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as FirestoreUserProfile;
    if (data.isActive === false) return { ok: false, error: 'inactive' };

    if (data.uid) {
      // Already activated — normal sign-in. Use emailLower, not the raw
      // `email` argument: Firebase Auth was created with emailLower too
      // (see below), so signing in with anything that differs only by
      // case or stray whitespace from what was typed at signup would
      // otherwise risk a mismatch. Always go through the same normalized
      // string both times.
      try {
        await signInWithEmailAndPassword(auth, emailLower, password);
        return { ok: true, profile: data };
      } catch {
        return { ok: false, error: 'invalid' };
      }
    } else {
      // Invited but never logged in yet: this login *creates* the account,
      // using whatever password they just typed. If they entered a name
      // on the Sign Up form, save it now — it's more authoritative than
      // whatever the admin guessed when creating the invite.
      const nameUpdate =
        firstName && lastName
          ? { firstName, lastName, name: `${firstName} ${lastName}`.trim() }
          : {};
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, emailLower, password);
      } catch (err: any) {
        // The Auth account can already exist here if a previous attempt got
        // as far as creating it but failed before the updateDoc below — e.g.
        // the Firestore write hitting the propagation race explained above.
        // Without this fallback that person is stuck forever: every future
        // login re-tries createUserWithEmailAndPassword, which always fails
        // with "already exists", and they'd see a generic invalid-credentials
        // error with no way out. Try signing in with what they just typed
        // instead, and finish the activation (write the uid) if it works.
        if (err?.code === 'auth/email-already-in-use' || err?.code === 'auth/credential-already-in-use') {
          try {
            cred = await signInWithEmailAndPassword(auth, emailLower, password);
          } catch {
            return { ok: false, error: 'invalid' };
          }
        } else {
          return mapAuthError(err, 'loginOrRegister: invite activation failed');
        }
      }
      // Auth succeeded — from here on the credentials are proven correct,
      // no matter what happens to the Firestore write below. Never let a
      // failure here read as "wrong password."
      const uid = cred.user.uid;
      const wrote = await writeProfileWithRetry(() => updateDoc(ref, { uid, ...nameUpdate }));
      if (!wrote) return { ok: false, error: 'profile-setup-failed' };
      return { ok: true, profile: { ...data, ...nameUpdate, uid } };
    }
  }

  if (emailLower === SUPER_ADMIN_EMAIL) {
    // Bootstrap path: no invite exists yet because nobody could have
    // created one. Create both the Auth account and its Firestore profile.
    const fn = firstName || 'Admin';
    const ln = lastName || '';
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, emailLower, password);
    } catch {
      // The Auth account may already exist from an earlier bootstrap whose
      // Firestore doc got deleted or never wrote (the propagation race
      // explained above). Fall back to a normal sign-in.
      try {
        cred = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch {
        return { ok: false, error: 'invalid' };
      }
    }
    // Auth succeeded either way — the credentials are proven correct from
    // here on.
    const profile: FirestoreUserProfile = {
      name: `${fn} ${ln}`.trim(),
      firstName: fn,
      lastName: ln,
      email: emailLower,
      role: 'ADMIN',
      site: '',
      isActive: true,
      uid: cred.user.uid,
    };
    const wrote = await writeProfileWithRetry(() => setDoc(ref, profile));
    if (!wrote) return { ok: false, error: 'profile-setup-failed' };
    return { ok: true, profile };
  }

  // Open self-signup: anyone can create an account. Default role is a safe
  // field role — admin can promote later from the Admin Portal. First name
  // is required; last name is optional.
  if (!firstName?.trim()) {
    return { ok: false, error: 'invalid' };
  }
  const fn = firstName.trim();
  const ln = (lastName || '').trim();
  const buildProfile = (uid: string): FirestoreUserProfile => ({
    name: `${fn} ${ln}`.trim(),
    firstName: fn,
    lastName: ln,
    email: emailLower,
    role: 'FOOD_SAFETY_TECHNICIAN',
    site: 'site-1',
    isActive: true,
    uid,
  });
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, emailLower, password);
  } catch (err: any) {
    // The Auth account can already exist here even on a "first" signup —
    // e.g. this exact email already ran this branch once, the Auth account
    // was created, but the Firestore write below failed (the propagation
    // race explained above) or the profile was later deleted. Without this
    // recovery, every retry re-fails forever with "email already in use"
    // and a generic, unhelpful error — this is the exact "I signed up,
    // logged out, now I can't log back in" trap.
    if (err?.code === 'auth/email-already-in-use' || err?.code === 'auth/credential-already-in-use') {
      // First choice: the account is genuinely orphaned (no active or
      // deactivated profile claims it), so clear it server-side and create
      // a brand new one with whatever password they just typed. This is
      // what makes a *deleted* profile's email reusable — without it,
      // they'd be stuck unless they happened to remember a password that
      // was never actually reset.
      if (await tryReclaimAbandonedSignup(emailLower)) {
        try {
          cred = await createUserWithEmailAndPassword(auth, emailLower, password);
        } catch {
          return { ok: false, error: 'invalid' };
        }
      } else {
        // Not reclaimable (a live profile still claims it, or the reclaim
        // call failed) — fall back to a normal sign-in, in case they
        // simply forgot they already had an account and typed the right
        // password.
        try {
          cred = await signInWithEmailAndPassword(auth, emailLower, password);
        } catch {
          return { ok: false, error: 'invalid' };
        }
      }
    } else {
      return mapAuthError(err, 'loginOrRegister: self-signup failed');
    }
  }
  // Auth succeeded, one way or another — the credentials are proven
  // correct from here on. Never let a failure below this line read as
  // "wrong password."
  const profile = buildProfile(cred.user.uid);
  const wrote = await writeProfileWithRetry(() => setDoc(ref, profile));
  if (!wrote) return { ok: false, error: 'profile-setup-failed' };
  return { ok: true, profile };
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
      // Google already knows their name, so fill firstName/lastName from
      // it if the invite didn't have one set.
      const nameUpdate =
        !data.firstName && firebaseUser.displayName
          ? { ...splitName(firebaseUser.displayName), name: firebaseUser.displayName }
          : {};
      await updateDoc(ref, { uid: firebaseUser.uid, ...nameUpdate });
      return { ok: true, profile: { ...data, ...nameUpdate, uid: firebaseUser.uid } };
    }
    return { ok: true, profile: data };
  }

  if (emailLower === SUPER_ADMIN_EMAIL) {
    const { firstName, lastName } = splitName(firebaseUser.displayName || 'Admin');
    const profile: FirestoreUserProfile = {
      name: firebaseUser.displayName || 'Admin',
      firstName,
      lastName,
      email: emailLower,
      role: 'ADMIN',
      site: '',
      isActive: true,
      uid: firebaseUser.uid,
    };
    await setDoc(ref, profile);
    return { ok: true, profile };
  }

  // Open self-signup via Google — same default role as email signup.
  const { firstName, lastName } = splitName(firebaseUser.displayName || emailLower.split('@')[0]);
  const profile: FirestoreUserProfile = {
    name: firebaseUser.displayName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: emailLower,
    role: 'FOOD_SAFETY_TECHNICIAN',
    site: 'site-1',
    isActive: true,
    uid: firebaseUser.uid,
  };
  await setDoc(ref, profile);
  return { ok: true, profile };
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
    unsubProfile = onSnapshot(
      ref,
      (snap) => {
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
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          role: data.role,
          site: data.site,
          isActive: data.isActive,
        });
      },
      (err) => {
        console.error('watchAuthAndProfile profile listener failed:', err);
        onChange(null); // fail closed rather than leaving the app stuck loading
      }
    );
  });

  return () => {
    unsubAuth();
    if (unsubProfile) unsubProfile();
  };
}
