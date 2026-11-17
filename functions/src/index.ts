import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
// Auth triggers (functions.auth.user().onCreate) are 1st-gen only — there's
// no 2nd-gen equivalent yet, so this one import stays on the v1 namespace
// while everything else in this file uses v2. Both coexist fine in the
// same Cloud Functions deployment.
import * as functionsV1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();

// Missed-check alerts (scheduled every 30 minutes).
export { checkMissedChecks } from './missedChecks';

// Error monitoring digest (hourly) — see monitoring.ts.
export { errorDigest } from './monitoring';
import { monitored } from './monitoring';

// Keep in sync with SUPER_ADMIN_EMAIL in src/services/authService.ts and
// the matching constant in firestore.rules. This one account is
// permanently an admin; see isAdminCaller() below for everyone else who
// holds the ADMIN role — it's no longer locked to just this address.
const SUPER_ADMIN_EMAIL = 'mpigome44@gmail.com';

// True for the bootstrap super-admin OR anyone an existing admin has
// since promoted to the ADMIN role in Firestore (see updateUserRole in
// src/store/useAppStore.ts) — mirrors isAdmin() in firestore.rules.
async function isAdminCaller(email: string): Promise<boolean> {
  if (email === SUPER_ADMIN_EMAIL) return true;
  const snap = await admin.firestore().collection('users').doc(email).get();
  return snap.exists && snap.data()?.role === 'ADMIN';
}

// Housekeeping / Food Safety / General Managers can manage non-admin
// accounts from the Manager Portal's Users tab — mirrors isManager() in
// firestore.rules.
const MANAGER_ROLES = ['HOUSEKEEPING_MANAGER', 'FOOD_SAFETY_MANAGER', 'GENERAL_MANAGER'];
async function isManagerCaller(email: string): Promise<boolean> {
  const snap = await admin.firestore().doc(`users/${email}`).get();
  return snap.exists && snap.data()?.isActive !== false && MANAGER_ROLES.includes(snap.data()?.role);
}

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
    if (!(await isAdminCaller(callerEmail))) {
      throw new HttpsError('permission-denied', 'Only an admin account can create staff accounts.');
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

// Upgrades a Staff ID login (StaffIdGate.tsx) to a real Firebase Auth
// session. Staff ID sign-in was originally built to deliberately skip
// Firebase Auth entirely (no password to sign in with) — see
// loginByStaffCode's comment in src/services/authService.ts — on the
// premise that nothing downstream needed a real Auth session anyway,
// since submissions/warnings lived only in localStorage regardless of
// Firebase mode. Now that those actually sync through Firestore (see
// submissionsService.ts / warningsService.ts), that premise no longer
// holds: firestore.rules gates every read/write on isSignedIn(), i.e.
// request.auth != null, which is never true for a session that skipped
// Auth — so a Staff-ID-only session could never read or write anything.
//
// A custom Auth token is the only way to fix this client-side-adjacent:
// only the Admin SDK can mint one, and it has to be minted for the SAME
// uid already on that person's users/{email} profile (set when their
// account was created — see adminCreateAccount.ts's
// createStaffAccountDirect, which always creates a real Firebase Auth
// account even for someone who'll only ever sign in with a Staff ID), so
// that signing in with it resolves to the exact same identity everywhere
// else in the app already expects (submission ownership, Site Access,
// the works).
//
// No auth required to call this — same reasoning as reclaimAbandonedSignup
// above: it's the pre-auth entry point itself. It only ever mints a token
// for a uid that a real, active users/{email} profile already names, gated
// by the same staffCode -> email -> profile lookup the client already did
// itself before Firebase Auth existed in this flow — this doesn't widen
// who could already sign in, it just gives that same person a real session.
export const mintStaffCodeToken = onCall(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (request) => {
    const staffCode = String(request.data?.staffCode || '').trim().toUpperCase();
    if (!staffCode) {
      throw new HttpsError('invalid-argument', 'Missing staff code.');
    }

    const mapSnap = await admin.firestore().collection('staffCodes').doc(staffCode).get();
    if (!mapSnap.exists) {
      throw new HttpsError('not-found', 'unknown-id');
    }
    const { email } = mapSnap.data() as { email?: string };
    if (!email) {
      throw new HttpsError('not-found', 'unknown-id');
    }

    const userSnap = await admin.firestore().collection('users').doc(email).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'unknown-id');
    }
    const profile = userSnap.data() as { uid?: string; isActive?: boolean };

    if (profile.isActive === false) {
      throw new HttpsError('permission-denied', 'inactive');
    }
    if (!profile.uid) {
      // A Staff ID was assigned before this profile was ever activated via
      // email (createStaffAccountDirect always creates the Auth account up
      // front, so this shouldn't normally happen) — fail clearly rather
      // than minting a token for a uid that doesn't exist.
      throw new HttpsError('failed-precondition', 'not-activated');
    }

    // Imported staff (bulkImportStaff) log in with Staff ID + password —
    // their Staff ID is their HR number, which other people know, so the ID
    // alone must never be enough to get a session.
    if ((profile as { requirePassword?: boolean }).requirePassword) {
      throw new HttpsError('failed-precondition', 'password-required');
    }

    const token = await admin.auth().createCustomToken(profile.uid);
    return { token };
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
// Redeploy trigger (no behavior change): this function's code hasn't
// changed since it was first created, so every functions deploy since
// then has reported it "Skipped (No changes detected)" and never
// touched it again — including never re-applying its IAM invoker
// binding. It was first deployed before the deploy service account had
// the "Cloud Functions Admin" role (added later while fixing
// mintStaffCodeToken's IAM binding), so its own public-invoker
// permission on Cloud Run likely never actually got set, even though
// the config below has always said invoker: 'public'. That's the exact
// shape of the CORS-preflight-blocked error the Admin Portal's reset
// login flow hits: an unauthenticated OPTIONS request gets rejected by
// Cloud Run's IAM layer before this function (or its cors:true handling)
// ever runs, and a browser reports a response with no CORS headers as a
// CORS failure rather than surfacing the real 403. This comment forces
// Firebase's "unchanged" diff to see a change and actually redeploy it,
// which reapplies the invoker binding now that the permission exists.
export const adminResetCredentials = onCall(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (request) => {
    const callerEmail = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !callerEmail) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const callerIsAdmin = await isAdminCaller(callerEmail);
    if (!callerIsAdmin && !(await isManagerCaller(callerEmail))) {
      throw new HttpsError('permission-denied', 'Only an admin or manager account can reset staff credentials.');
    }

    const { uid, currentEmail, newEmail, newPassword } =
      request.data || ({} as AdminResetCredentialsData);

    if (!uid || !currentEmail) {
      throw new HttpsError('invalid-argument', 'Missing uid or currentEmail.');
    }
    const currentEmailLower = String(currentEmail).trim().toLowerCase();

    // Managers can reset anyone's login except an ADMIN account's — same
    // limit as firestore.rules' isManager() on users/{email}.
    if (!callerIsAdmin) {
      const targetSnap = await admin.firestore().doc(`users/${currentEmailLower}`).get();
      if (targetSnap.exists && targetSnap.data()?.role === 'ADMIN') {
        throw new HttpsError('permission-denied', "A manager can't reset an admin account's login.");
      }
    }
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

// Only the API secret is sensitive (see storage/Cloudinary setup notes) —
// Cloudinary's own docs say the cloud name and API key are fine in
// client-facing code, so there's no reason to route those through Secret
// Manager too, or to give the client its own copy in a Vercel env var.
// Keeping them here means this function is the one place that knows
// where uploads go; it hands the client everything it needs — cloud
// name, API key, folder, signature — in one response.
const cloudinaryApiSecret = defineSecret('CLOUDINARY_API_SECRET');
const CLOUDINARY_CLOUD_NAME = 'vluj4mch';
const CLOUDINARY_API_KEY = '454911198414833';

// A hard ceiling on what actually gets STORED, independent of whatever
// the client sends. PhotoCapture.tsx already downscales to 1280px/0.85
// quality before it ever uploads (typically 150-400KB), so this rarely
// does anything today — but it means stored size is never at the mercy
// of the uploader alone: a future call site that skips that downscale,
// an unusually large source photo, or a different image format
// encoding bigger than expected all land here the same way. This is an
// "incoming transformation" (Cloudinary's term) — applied once at
// upload time, so Cloudinary transforms and discards the original,
// storing only the capped version; it's separate from
// cloudinaryUrl.ts's f_auto/q_auto, which only affects what's served on
// a given VIEW, not what's kept in storage. 1600px is deliberately
// looser than the client's own 1280px cap — a ceiling to catch outliers,
// not a second resize fighting the first.
const CLOUDINARY_UPLOAD_TRANSFORMATION = 'w_1600,h_1600,c_limit,q_auto:good';

// Lets any signed-in user upload a submission photo straight to
// Cloudinary without this app ever handing out Cloudinary's API secret.
// Firebase Storage (storage.rules) used to hold these; moved off it
// because its free tier is a flat 5GB, while a photo here gets *viewed*
// (by a reviewing supervisor, a manager, Admin's Activity tab) far more
// times than it's ever uploaded — Cloudinary's free tier covers
// bandwidth generously too, and src/utils/cloudinaryUrl.ts serves an
// auto-optimized version on every view instead of the original. Old
// photos already in Firebase Storage keep working — storage.rules is
// untouched — nothing new gets written through it after this.
//
// This is Cloudinary's documented "signed upload" scheme: the browser
// sends the file straight to Cloudinary's own endpoint (never through
// this function, so photo bytes never touch our server — only this
// small signing step does), authorized by a signature that only someone
// who can call this function (a real signed-in user) can ever produce.
// The folder is fixed to the caller's own uid server-side (not taken
// from the client) and is itself part of what gets signed, so a caller
// can't request a signature for one folder and then upload somewhere
// else — Cloudinary checks the signature against the exact params sent.
export const mintCloudinaryUploadSignature = onCall(
  { region: 'us-central1', invoker: 'public', cors: true, secrets: [cloudinaryApiSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `psu-submissions/${request.auth.uid}`;
    // Every param actually sent with the upload has to appear here too,
    // sorted alphabetically by key — Cloudinary recomputes this same
    // string on its end and rejects the upload if the signature doesn't
    // match, so the client can't send a different transformation (or
    // drop it) than what was actually signed.
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${CLOUDINARY_UPLOAD_TRANSFORMATION}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + cloudinaryApiSecret.value())
      .digest('hex');

    return {
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      folder,
      transformation: CLOUDINARY_UPLOAD_TRANSFORMATION,
    };
  }
);

// ── Chat push notifications ──────────────────────────────────────────
// When a chat message is created (src/store/useAppStore.ts's
// sendChatMessage), push it to every device the recipient enabled
// notifications on (pushTokens/{token}, written by
// src/lib/pushNotifications.ts). Data-only message: public/sw.js decides
// how the notification looks and skips it if the app is already focused.
// 1st-gen Firestore trigger on purpose — it works with the (default)
// database in any location, no Eventarc region pairing needed.
export const notifyChatMessage = functionsV1.firestore
  .document('messages/{messageId}')
  .onCreate((snap) => monitored('notifyChatMessage', async () => {
    const m = snap.data() as { toId?: string; fromName?: string; text?: string };
    if (!m?.toId) return;

    const tokensSnap = await admin.firestore().collection('pushTokens').where('uid', '==', m.toId).get();
    if (tokensSnap.empty) return;
    const tokens = tokensSnap.docs.map((d) => d.id);

    const body = (m.text || '').slice(0, 180);
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        title: m.fromName || 'PSU FieldOps',
        body,
        url: '/?tab=chat',
        tag: `chat-${snap.id}`,
      },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });

    // Drop tokens FCM says are dead (app uninstalled, permission revoked…).
    const dead: Promise<unknown>[] = [];
    response.responses.forEach((r, i) => {
      const code = r.error?.code || '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
        dead.push(admin.firestore().collection('pushTokens').doc(tokens[i]).delete());
      }
    });
    await Promise.all(dead);
  }));


// ── Sent-back logs ───────────────────────────────────────────────────
// A Supervisor / Manager rejects or returns a log (useAppStore.ts's
// rejectSignoff / returnSubmission → status REJECTED, meta.returned):
// push the filer ("fix and resend", opens the log at /?fix=<id>), plus
// anyone lower in the chain who had already stamped it. When the filer
// fixes and resends it (REJECTED → PENDING), push whoever sent it back.
const LOG_LABELS: Record<string, string> = {
  HOUSEKEEPING: "Today's Checklist", FOOD_SAFETY: 'Daily Food Safety Log', TEMP_CONTROL: 'Temperature Control',
  DISHWASH_TEMP: 'Dishwashing Temperature', MESS_HALL_HYGIENE: 'Mess Hall Hygiene', COOKING_SERVICE: 'Cooking & Service',
  HOT_PACKED_MEAL: 'Hot Packed Meal', THAWING: 'Thawing', STAFF_READY: 'Staff Ready', LAUNDRY_SHOP: 'Laundry Shop',
  RESTROOM: 'Restroom', GEMBA_WALK: 'Gemba Walk',
};

async function pushTo(uids: string[], data: Record<string, string>) {
  const unique = [...new Set(uids.filter(Boolean))];
  if (!unique.length) return;
  const db = admin.firestore();
  // 30 uids per query (Firestore `in` limit) instead of one query each.
  const groups: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) groups.push(unique.slice(i, i + 30));
  const snaps = await Promise.all(groups.map((g) => db.collection('pushTokens').where('uid', 'in', g).get()));
  const tokens = snaps.flatMap((sn) => sn.docs.map((d) => d.id));
  if (!tokens.length) return;
  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    data,
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  });
  const dead: Promise<unknown>[] = [];
  response.responses.forEach((r, i) => {
    const code = r.error?.code || '';
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
      dead.push(db.collection('pushTokens').doc(tokens[i]).delete());
    }
  });
  await Promise.all(dead);
}

export const notifySubmissionReturned = functionsV1.firestore
  .document('submissions/{submissionId}')
  .onUpdate((change, ctx) => monitored('notifySubmissionReturned', async () => {
    const before = change.before.data() as any;
    const after = change.after.data() as any;
    if (!before || !after || after.deletedAt) return;
    const label = LOG_LABELS[after.type] || 'Log';
    const site = after.siteName ? ` · ${after.siteName}` : '';

    if (before.status !== 'REJECTED' && after.status === 'REJECTED') {
      const r = after.meta?.returned || {};
      const note = String(r.note || after.rejectionReason || '').slice(0, 160);
      const by = r.name ? `${r.name}: ` : '';
      await pushTo([after.userId], {
        title: `Fix needed: ${label}`,
        body: `${by}${note}`,
        url: `/?fix=${ctx.params.submissionId}`,
        tag: `fix-${ctx.params.submissionId}`,
      });
      // Anyone below the rejecter who had already stamped it.
      const so = before.meta?.signoff || {};
      const stampers = ['checkedBy', 'approvedBy', 'verifiedBy']
        .map((k) => so[k]?.userId as string | undefined)
        .filter((u): u is string => !!u && u !== r.userId && u !== after.userId);
      await pushTo(stampers, {
        title: `Sent back: ${label}${site}`,
        body: `${r.name || 'A reviewer'} sent ${after.userName || 'the'}'s log back to fix: ${note}`,
        url: '/',
        tag: `fix-${ctx.params.submissionId}`,
      });
      return;
    }

    // Sent back to a reviewer lower in the chain (e.g. Manager → the
    // Supervisor who checked it): push that reviewer.
    const rb = before.meta?.returned;
    const ra = after.meta?.returned;
    if (after.status === 'PENDING' && ra?.to === 'reviewer' && ra.toUserId && ra.at !== rb?.at) {
      await pushTo([ra.toUserId], {
        title: `Sent back to you: ${label}${site}`,
        body: `${ra.name || 'Your manager'}: ${String(ra.note || '').slice(0, 160)}`,
        url: `/?fix=${ctx.params.submissionId}`,
        tag: `fix-${ctx.params.submissionId}`,
      });
      return;
    }
    // …and that reviewer fixed it and sent it back up.
    if (ra?.to === 'reviewer' && ra.resolved && !rb?.resolved && ra.userId) {
      await pushTo([ra.userId], {
        title: `Fixed & sent back up: ${label}${site}`,
        body: `${ra.resolved.name || 'The reviewer'}: ${String(ra.resolved.note || '').slice(0, 160)}`,
        url: '/',
        tag: `fix-${ctx.params.submissionId}`,
      });
      return;
    }

    if (before.status === 'REJECTED' && after.status === 'PENDING') {
      const r = after.meta?.returned;
      if (!r?.userId || r.userId === after.userId) return;
      const fix = String(after.meta?.fixNote || '').slice(0, 160);
      await pushTo([r.userId], {
        title: `Fixed & resent: ${label}${site}`,
        body: `${after.userName || 'The filer'} fixed it and sent it back for review.${fix ? ` "${fix}"` : ''}`,
        url: '/',
        tag: `fix-${ctx.params.submissionId}`,
      });
    }
  }));

// ── New logs reach the next reviewer ────────────────────────────────
// Whenever a log arrives at a sign-off step — a technician submits it,
// a Supervisor stamps it so it moves up to the Manager, or a fixed log
// is resubmitted — push everyone who can stamp that step: Leadhands /
// Supervisors for "Checked by", Managers for "Approved / Verified by",
// in the log's department, covering its site (same reach as the app's
// review queue, src/lib/logLifecycle.ts's reviewQueueFor). Never the
// filer, never someone who already stamped another step of it. One
// collapsing notification per site and department, so a busy morning
// doesn't stack dozens.
// Staff by role, cached in the function instance for 10 minutes: at ~3,000
// logs a day, re-reading the reviewers' profiles on every single write
// would cost hundreds of thousands of reads a day for data that barely
// changes. A role change reaches notifications within 10 minutes.
const roleCache = new Map<string, { at: number; users: any[] }>();
async function usersWithRoles(roles: string[]): Promise<any[]> {
  const key = [...roles].sort().join(',');
  const hit = roleCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.users;
  const snap = await admin.firestore().collection('users').where('role', 'in', roles).get();
  const users = snap.docs.map((d) => d.data());
  roleCache.set(key, { at: Date.now(), users });
  return users;
}

const CHAINS: Record<string, string[]> = {
  TEMP_CONTROL: ['checkedBy', 'approvedBy'], DISHWASH_TEMP: ['checkedBy', 'approvedBy'],
  MESS_HALL_HYGIENE: ['checkedBy', 'approvedBy', 'verifiedBy'], COOKING_SERVICE: ['checkedBy', 'approvedBy'],
  HOT_PACKED_MEAL: ['checkedBy', 'approvedBy'], THAWING: ['checkedBy', 'verifiedBy'], STAFF_READY: ['approvedBy', 'verifiedBy'],
  LAUNDRY_SHOP: ['checkedBy', 'approvedBy'], RESTROOM: ['checkedBy', 'approvedBy'], FOOD_SAFETY: ['checkedBy', 'approvedBy'],
  HOUSEKEEPING: ['checkedBy', 'approvedBy'], GEMBA_WALK: ['approvedBy'],
};
const HK_TYPES = new Set(['HOUSEKEEPING', 'RESTROOM', 'LAUNDRY_SHOP']);

function logDept(s: any): 'HOUSEKEEPING' | 'FOOD_SAFETY' {
  if (s.type === 'GEMBA_WALK') return String(s.role || '').startsWith('HOUSEKEEPING') ? 'HOUSEKEEPING' : 'FOOD_SAFETY';
  return HK_TYPES.has(s.type) ? 'HOUSEKEEPING' : 'FOOD_SAFETY';
}
function nextStep(s: any): string | undefined {
  const so = s?.meta?.signoff || {};
  return (CHAINS[s?.type] || []).find((k) => !so[k]);
}
function roleWords(r?: string): string {
  return String(r || '').toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function coversSite(u: any, siteId: string): boolean {
  if (u.isActive === false || !u.uid) return false;
  const a = u.assignedSites;
  if (a === 'ALL') return true;
  if (Array.isArray(a) && a.length > 0) return a.includes(siteId);
  return u.site === siteId;
}

export const notifyReviewers = functionsV1.firestore
  .document('submissions/{submissionId}')
  .onWrite((change, ctx) => monitored('notifyReviewers', async () => {
    const after = change.after.exists ? (change.after.data() as any) : null;
    const before = change.before.exists ? (change.before.data() as any) : null;
    if (!after || after.status !== 'PENDING' || after.deletedAt) return;
    const step = nextStep(after);
    if (!step) return;
    // Nothing new for reviewers: same step, still pending.
    if (before && before.status === 'PENDING' && !before.deletedAt && nextStep(before) === step) return;
    // Sent back to one specific reviewer — notifySubmissionReturned tells them.
    const r = after.meta?.returned;
    if (r?.to === 'reviewer' && !r.resolved) return;

    const dept = logDept(after);
    const roles = step === 'checkedBy'
      ? [`${dept}_SUPERVISOR`, `${dept}_LEADHAND`]
      : [`${dept}_MANAGER`];
    const so = after.meta?.signoff || {};
    // Same level only (src/lib/logLifecycle.ts's stampProblem): someone who
    // checked it as Supervisor may still approve it as Manager.
    const sameLevel = step === 'checkedBy' ? ['checkedBy'] : ['approvedBy', 'verifiedBy'];
    const stampers = new Set(sameLevel.map((k) => so[k]?.userId).filter(Boolean));
    const uids = (await usersWithRoles(roles))
      .filter((u) => coversSite(u, after.siteId) && u.uid !== after.userId && !stampers.has(u.uid))
      .map((u) => u.uid as string);
    if (!uids.length) return;

    const label = LOG_LABELS[after.type] || 'Log';
    const site = after.siteName || after.siteId || '';
    const who = `${after.userName || 'Someone'} (${roleWords(after.role)})`;
    await pushTo(uids, {
      title: step === 'checkedBy' ? `New log to check: ${label}` : `Ready for your approval: ${label}`,
      body: step === 'checkedBy'
        ? `${who} · ${site} — tap to review.`
        : `Checked by ${so.checkedBy?.name || 'the supervisor'} · ${site} — tap to review.`,
      url: '/?tab=opslogs',
      tag: `review-${dept}-${after.siteId}-${step}`,
    });
  }));

// ── Reported issues (wrench) ─────────────────────────────────────────
// A worker reports something broken: push the Leadhands, Supervisors and
// Managers of that department who cover the site — same reach as the
// app's Reports / Issues tab. Tap opens that tab (/?tab=reports).
export const notifyFieldReport = functionsV1.firestore
  .document('fieldReports/{reportId}')
  .onCreate((snap) => monitored('notifyFieldReport', async () => {
    const r = snap.data() as any;
    if (!r?.department || !r.siteId) return;
    const roles = [`${r.department}_LEADHAND`, `${r.department}_SUPERVISOR`, `${r.department}_MANAGER`];
    const uids = (await usersWithRoles(roles))
      .filter((u) => coversSite(u, r.siteId) && u.uid !== r.userId)
      .map((u) => u.uid as string);
    await pushTo(uids, {
      title: `Issue reported · ${r.siteName || r.siteId}`,
      body: `${r.userName || 'Someone'} (${roleWords(r.role)}): ${String(r.message || '').slice(0, 160)}`,
      url: '/?tab=reports',
      tag: `report-${snap.id}`,
    });
  }));

// ── Action items ──────────────────────────────────────────────────────
// Assigned → push the assignee. Marked done → push whoever assigned it,
// to verify. Sent back (DONE → OPEN) → push the assignee again.
export const notifyActionItem = functionsV1.firestore
  .document('correctiveActions/{actionId}')
  .onWrite((change, ctx) => monitored('notifyActionItem', async () => {
    const before = change.before.exists ? (change.before.data() as any) : null;
    const a = change.after.exists ? (change.after.data() as any) : null;
    if (!a) return;
    const what = String(a.action || a.comment || '').slice(0, 140);
    const due = a.dueDate ? ` · due ${a.dueDate}` : '';
    const tag = `action-${ctx.params.actionId}`;
    if (!before && a.status === 'OPEN') {
      await pushTo([a.assignedToId], { title: `New action item from ${a.createdByName || 'your supervisor'}`, body: `${what}${due}`, url: '/?tab=actions', tag });
    } else if (before?.status === 'OPEN' && a.status === 'DONE') {
      await pushTo([a.createdById], { title: `Action item done — please verify`, body: `${a.assignedToName || 'Staff'}: ${String(a.completionNote || what).slice(0, 140)}`, url: '/?tab=actions', tag });
    } else if (before?.status === 'DONE' && a.status === 'OPEN') {
      await pushTo([a.assignedToId], { title: `Action item sent back`, body: `${String(a.reopenedNote || what).slice(0, 140)}${due}`, url: '/?tab=actions', tag });
    }
  }));

// ── Bulk employee import ─────────────────────────────────────────────
// Admin Portal → Import Staff (src/components/Admin/ImportStaffPanel.tsx)
// sends rows already mapped to a site + role (src/lib/employeeImport.ts),
// up to 100 per call. For each new Staff ID this creates the Firebase Auth
// account with a random password, the users/{email} profile and the
// staffCodes/{ID} index, and returns the password once so the Admin can
// hand it out. The login email is synthetic (<id>@staff.psu.local) —
// people log in with Staff ID + password, never the email. Re-running an
// import is safe: existing Staff IDs are reported as "exists", untouched.
const IMPORT_ROLES = new Set([
  'HOUSEKEEPER', 'HOUSEKEEPING_LAUNDRY', 'HOUSEKEEPING_JANITOR', 'HOUSEKEEPING_LEADHAND', 'HOUSEKEEPING_SUPERVISOR', 'HOUSEKEEPING_MANAGER',
  'FOOD_SAFETY_TECHNICIAN', 'FOOD_SAFETY_LEADHAND', 'FOOD_SAFETY_SUPERVISOR', 'FOOD_SAFETY_MANAGER', 'GENERAL_MANAGER',
]);
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function randomPassword(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  return out;
}

interface ImportRow { staffId: string; name: string; site: string; role: string }
type ImportResult = { staffId: string; status: 'created' | 'exists' | 'error'; password?: string; message?: string };

async function importOne(row: ImportRow): Promise<ImportResult> {
  const staffId = String(row.staffId || '').trim().toUpperCase();
  const name = String(row.name || '').trim().replace(/\s+/g, ' ');
  const site = String(row.site || '').trim();
  const role = String(row.role || '');
  if (!/^[A-Z0-9]{3,12}$/.test(staffId) || !name || !site || !IMPORT_ROLES.has(role)) {
    return { staffId, status: 'error', message: 'invalid-row' };
  }
  const db = admin.firestore();
  const email = `${staffId.toLowerCase()}@staff.psu.local`;
  const codeRef = db.collection('staffCodes').doc(staffId);
  const userRef = db.collection('users').doc(email);
  const [codeSnap, userSnap] = await Promise.all([codeRef.get(), userRef.get()]);
  if (codeSnap.exists || userSnap.exists) return { staffId, status: 'exists' };

  const uid = db.collection('_ids').doc().id;
  const password = randomPassword();
  const [firstName, ...rest] = name.split(' ');
  // Profile first, so the createUserProfile auth trigger finds it already
  // there and leaves it alone.
  await db.batch()
    .set(userRef, {
      name, firstName, lastName: rest.join(' '), email, role, site,
      isActive: true, uid, staffCode: staffId, requirePassword: true,
      importedAt: new Date().toISOString(),
    })
    .set(codeRef, { email })
    .commit();
  try {
    await admin.auth().createUser({ uid, email, password, displayName: name });
  } catch (err: any) {
    await Promise.all([userRef.delete(), codeRef.delete()]).catch(() => {});
    return { staffId, status: 'error', message: err?.code || 'create-failed' };
  }
  return { staffId, status: 'created', password };
}

export const bulkImportStaff = onCall(
  { region: 'us-central1', invoker: 'public', cors: true, timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    const callerEmail = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !callerEmail) throw new HttpsError('unauthenticated', 'You must be signed in.');
    if (!(await isAdminCaller(callerEmail))) throw new HttpsError('permission-denied', 'Only an admin can import staff.');

    const rows = (request.data?.rows || []) as ImportRow[];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100) {
      throw new HttpsError('invalid-argument', 'Send between 1 and 100 rows per call.');
    }
    const results: ImportResult[] = [];
    // Small parallel batches — fast, but well inside Auth's rate limits.
    for (let i = 0; i < rows.length; i += 10) {
      results.push(...await Promise.all(rows.slice(i, i + 10).map(r => importOne(r).catch((err) => ({
        staffId: String(r?.staffId || ''), status: 'error' as const, message: err?.message || 'failed',
      })))));
    }
    return { results };
  }
);
