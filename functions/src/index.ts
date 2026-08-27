import { onCall, HttpsError } from 'firebase-functions/v2/https';
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
