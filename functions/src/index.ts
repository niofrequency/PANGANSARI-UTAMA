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

    if (!email || !password || !firstName || !lastName || !role || !site) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }
    if (role === 'ADMIN') {
      throw new HttpsError('invalid-argument', "Admin accounts can't be created this way.");
    }
    if (password.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const emailLower = String(email).trim().toLowerCase();
    const name = `${firstName} ${lastName}`.trim();

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
        firstName,
        lastName,
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
