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

// Called from the Admin Portal's "Add Staff Member" form. This exists
// because the regular (browser) Firebase SDK can only ever create YOUR
// OWN account — it has no way to create a login for someone else with a
// password you choose. That capability requires the Admin SDK, which
// only runs in a trusted server environment like this Cloud Function —
// never in a browser, since it has full account-creation privileges.
//
// Creates both halves of a working account in one step:
//   1. The actual Firebase Auth login (email + password)
//   2. The linked Firestore profile (role, site, etc.) — already carrying
//      the new user's uid, so they can log in immediately, with no
//      separate "activate your account" step required.
export const createStaffAccount = onCall<CreateStaffAccountData>(async (request) => {
  const callerEmail = request.auth?.token?.email?.toLowerCase();
  if (!request.auth || !callerEmail) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Only the admin account can create staff accounts.');
  }

  const { email, password, firstName, lastName, role, site } = request.data || ({} as CreateStaffAccountData);

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
    // Roll back the auth account rather than leaving an orphaned login
    // with no profile — otherwise that email is "used up" with nothing
    // to show for it, and even the admin can't fix it from the app.
    await admin.auth().deleteUser(userRecord.uid).catch(() => {});
    console.error('createStaffAccount: Firestore write failed', err);
    throw new HttpsError('internal', 'Failed to save the staff profile. Please try again.');
  }

  return { success: true, uid: userRecord.uid };
});
