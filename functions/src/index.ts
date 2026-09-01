import { onCall, HttpsError } from 'firebase-functions/v2/https';
// Auth triggers (functions.auth.user().onCreate) are 1st-gen only — there's
// no 2nd-gen equivalent yet, so this one import stays on the v1 namespace
// while everything else in this file uses v2. Both coexist fine in the
// same Cloud Functions deployment.
import * as functionsV1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Keep in sync with SUPER_ADMIN_EMAIL in src/services/authService.ts and
// the matching constant in firestore.rules — all three independently
// enforce "only this one account has admin powers."
const SUPER_ADMIN_EMAIL = 'mpigome44@gmail.com';

interface CreateStaffAccountData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  site: string;
}

// invoker: 'public' is required for 2nd-gen callable functions so the
// browser can reach them (Firebase Auth still protects the handler).
// Without it, Cloud Run returns 403 and the browser reports a CORS error.
export const createStaffAccount = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
  },
  async (request) => {
    const callerEmail = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !callerEmail) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    if (callerEmail !== SUPER_ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'Only the admin account can create staff accounts.');
    }

    const { email, password, firstName, lastName, role, site } =
      request.data || ({} as CreateStaffAccountData);

    if (!email || !password || !firstName || !role || !site) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }
    if (role === 'ADMIN') {
      throw new HttpsError('invalid-argument', "Admin accounts can't be created this way.");
    }
    if (password.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const emailLower = String(email).trim().toLowerCase();
    const fn = String(firstName).trim();
    const ln = String(lastName || '').trim();
    const name = `${fn} ${ln}`.trim();

    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: emailLower,
        password,
        displayName: name,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'An account with this email already exists.');
      }
      console.error('createStaffAccount: createUser failed', err);
      throw new HttpsError('internal', 'Failed to create the login. Please try again.');
    }

    try {
      await admin.firestore().collection('users').doc(emailLower).set({
        name,
        firstName: fn,
        lastName: ln,
        email: emailLower,
        role,
        site,
        isActive: true,
        uid: userRecord.uid,
      });
    } catch (err) {
      await admin.auth().deleteUser(userRecord.uid).catch(() => {});
      console.error('createStaffAccount: Firestore write failed', err);
      throw new HttpsError('internal', 'Failed to save the staff profile. Please try again.');
    }

    return { success: true, uid: userRecord.uid };
  }
);

// Fixes a real lockout: if a Firestore users/{email} profile gets deleted
// (Admin Portal's delete button, or manually in the Firebase Console) but
// nobody deletes the matching Firebase Auth account too — the client SDK
// can't do that for anyone but the currently-signed-in user — that email is
// stuck forever. Self-signup always fails with "email already exists," and
// the person has no way back in without knowing a password that was never
// actually reset. This callable clears the orphaned Auth account so the
// client's normal self-signup flow can just try again from a clean slate.
//
// No auth required to call this — it runs before the person has any
// session — but that's safe: it only ever deletes an Auth account that
// nothing in the app currently claims. An ACTIVE profile (a real signed-in
// person) or a DEACTIVATED one (an admin's deliberate lockout) both refuse
// the reclaim below, so this can never be used to bypass either.
export const reclaimAbandonedSignup = onCall(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (request) => {
    const email = String(request.data?.email || '').trim().toLowerCase();
    if (!email) {
      throw new HttpsError('invalid-argument', 'Missing email.');
    }

    let authUser: admin.auth.UserRecord;
    try {
      authUser = await admin.auth().getUserByEmail(email);
    } catch {
      // No Auth account at all for this email — nothing to reclaim, the
      // normal self-signup path will just create one from scratch.
      return { reclaimed: false, reason: 'no-account' };
    }

    const docSnap = await admin.firestore().collection('users').doc(email).get();
    if (!docSnap.exists) {
      // Auth account exists, but nothing in Firestore claims it — genuinely
      // orphaned (deleted profile, or a signup that crashed between
      // createUser and the Firestore write). Safe to clear.
      await admin.auth().deleteUser(authUser.uid);
      return { reclaimed: true };
    }

    const data = docSnap.data() || {};
    if (data.isActive === false) {
      // Deliberately deactivated by an admin — not ours to override here.
      return { reclaimed: false, reason: 'deactivated' };
    }
    // A live profile still claims this account (active, or an unactivated
    // invite waiting for its owner) — leave it alone.
    return { reclaimed: false, reason: 'active' };
  }
);

// Best-effort split for a single display-name string — first token is the
// first name, the rest is the last name. Mirrors splitName() in
// src/services/authService.ts; duplicated here because Cloud Functions is a
// separate TypeScript project and can't import client source directly.
function splitDisplayName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// The guaranteed backstop for "the profile doc gets created/linked when a
// Firebase Auth account exists." authService.ts on the client already
// writes this doc itself right after signup (with a retry — see
// writeProfileWithRetry there), and that fast path is what most people
// experience: instant login, no waiting on this trigger at all. This
// function exists for when that client write never lands — a closed tab,
// a lost connection, anything — because unlike a client-side write, this
// one doesn't depend on the person's browser, network, or session still
// being around. It runs the moment Firebase Auth finishes creating the
// account, server-side, via the Admin SDK, which isn't subject to the
// client ID-token-propagation race that motivated the retry in the first
// place.
//
// Fully idempotent with the client's own write: if the client already got
// there first, this just no-ops (or, for the invite path, only fills in
// `uid` if it's still missing) — it never overwrites a name or role a
// human already corrected.
export const createUserProfile = functionsV1.auth.user().onCreate(async (user) => {
  const emailLower = (user.email || '').toLowerCase();
  if (!emailLower) return; // no email on this account (shouldn't happen for email/password or Google sign-in) — nothing to link

  // Give the client's own write (authService.ts, the fast path almost
  // everyone hits) a head start. Both this trigger and the client can only
  // ever agree on identical role/site/uid defaults for a brand-new
  // self-signup, but the client has the one thing this trigger has to
  // guess at — the person's actual typed name — so letting it land first
  // avoids this trigger overwriting a correct name with a
  // displayName/email-derived approximation on the rare occasion both
  // would otherwise race to create the doc at the same moment.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const ref = admin.firestore().collection('users').doc(emailLower);

  // Small retry, same reasoning as writeProfileWithRetry on the client:
  // covers a transient Firestore hiccup without giving up on the very
  // first blip. Two attempts, short gap.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const snap = await ref.get();

      if (snap.exists) {
        const data = snap.data() || {};
        if (!data.uid) {
          // Pre-existing invite (admin-created via Add Staff's fallback
          // path, or a re-run of the super-admin bootstrap) — link it.
          await ref.update({ uid: user.uid });
        }
        // If uid is already set, either the client's own write already
        // finished, or something else already claimed this doc — either
        // way, nothing for this trigger to do.
        return;
      }

      // No profile at all: a genuine open self-signup (or first-time
      // Google sign-in) with no admin invite. Recreate the same default
      // profile authService.ts's client-side self-signup branch builds —
      // FOOD_SAFETY_TECHNICIAN / site-1 — except for the one bootstrap
      // exception, mirrored here too so the very first admin account
      // still comes out right even if this trigger is what creates it.
      const isSuperAdmin = emailLower === SUPER_ADMIN_EMAIL;
      const { firstName, lastName } = splitDisplayName(user.displayName || emailLower.split('@')[0]);
      await ref.set({
        name: user.displayName || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email: emailLower,
        role: isSuperAdmin ? 'ADMIN' : 'FOOD_SAFETY_TECHNICIAN',
        site: isSuperAdmin ? '' : 'site-1',
        isActive: true,
        uid: user.uid,
      });
      return;
    } catch (err) {
      console.error(`createUserProfile: attempt ${attempt} failed for ${emailLower}:`, err);
      if (attempt === 2) return; // give up quietly — the client-side write is still the primary path
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
});

interface AdminResetCredentialsData {
  uid: string;
  currentEmail: string;
  newEmail?: string;
  newPassword?: string;
}

// Lets the super-admin type a new email and/or password for someone else's
// account directly in the Admin Portal. There's no client-only way to do
// this: Firebase Auth's browser SDK can only ever change the CURRENTLY
// signed-in user's own credentials (or send a password-reset email the
// person has to click themselves) — overwriting a different account's
// email or password takes the Admin SDK, which only runs server-side. This
// is the one Admin Portal feature in this app that genuinely can't avoid
// needing a Cloud Function the way createStaffAccountDirect avoided it for
// account creation.
export const adminResetCredentials = onCall(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (request) => {
    const callerEmail = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !callerEmail) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    if (callerEmail !== SUPER_ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'Only the admin account can reset staff credentials.');
    }

    const { uid, currentEmail, newEmail, newPassword } =
      request.data || ({} as AdminResetCredentialsData);

    if (!uid || !currentEmail) {
      throw new HttpsError('invalid-argument', 'Missing uid or currentEmail.');
    }
    const currentEmailLower = String(currentEmail).trim().toLowerCase();
    const newEmailLower = newEmail ? String(newEmail).trim().toLowerCase() : undefined;

    // Manage your own login the normal way (it's how you're authenticated
    // right now) — routing it through this admin tool risks locking
    // yourself out with no one left to fix it.
    if (currentEmailLower === SUPER_ADMIN_EMAIL) {
      throw new HttpsError('invalid-argument', "Can't reset the admin account's own credentials from here.");
    }
    if (!newEmailLower && !newPassword) {
      throw new HttpsError('invalid-argument', 'Provide a new email, a new password, or both.');
    }
    if (newPassword && newPassword.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const authUpdate: { email?: string; password?: string } = {};
    if (newEmailLower && newEmailLower !== currentEmailLower) authUpdate.email = newEmailLower;
    if (newPassword) authUpdate.password = newPassword;

    if (Object.keys(authUpdate).length > 0) {
      try {
        await admin.auth().updateUser(uid, authUpdate);
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          throw new HttpsError('already-exists', 'Another account already uses that email.');
        }
        if (err.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', "That account's login couldn't be found.");
        }
        console.error('adminResetCredentials: updateUser failed', err);
        throw new HttpsError('internal', 'Failed to update the login. Please try again.');
      }
    }

    // Firestore docs are keyed by email (see authService.ts), so changing
    // the email means migrating the profile to a new doc id, not just
    // editing a field.
    if (authUpdate.email) {
      const oldRef = admin.firestore().collection('users').doc(currentEmailLower);
      const oldSnap = await oldRef.get();
      const oldData = oldSnap.exists ? oldSnap.data() || {} : {};
      try {
        await admin.firestore().collection('users').doc(newEmailLower!).set({
          ...oldData,
          email: newEmailLower,
          uid,
        });
        await oldRef.delete();
      } catch (err) {
        console.error('adminResetCredentials: Firestore migration failed', err);
        throw new HttpsError('internal', 'Login was updated, but saving the new profile location failed. Please try again.');
      }
    }

    return { success: true };
  }
);
