// Firebase client SDK setup. Reads config from Vite env vars so you can
// deploy this to Vercel and just paste your Firebase project's keys into
// the Vercel Environment Variables panel — nothing to edit in code.
//
// Required env vars (Vercel → Project Settings → Environment Variables),
// all values come from Firebase Console → Project Settings → General →
// "Your apps" → SDK setup and configuration:
//
//   VITE_FIREBASE_API_KEY
//   VITE_FIREBASE_AUTH_DOMAIN
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID
//   VITE_FIREBASE_APP_ID
//
// The VITE_ prefix is required — Vite only exposes prefixed vars to the
// browser bundle. See .env.example for a local-dev template, and
// FIREBASE_SETUP.md for the full walkthrough.
//
// If these are absent (e.g. running the repo fresh, before you've created
// a Firebase project), the app deliberately falls back to the original
// localStorage-backed demo mode instead of crashing — see useAppStore.ts.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  terminate, clearIndexedDbPersistence, type Firestore,
} from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Exported (not just used locally) so adminCreateAccount.ts can spin up its
// own secondary Firebase App instance with the same project config — see
// that file for why creating a staff login needs a second instance at all.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const app: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length ? getApps()[0]! : initializeApp(firebaseConfig))
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
// ignoreUndefinedProperties matters here specifically: form code all over
// this app builds submission fields like `remarks: [...].join(' · ') ||
// undefined` (omit if empty) — Firestore's default behavior is to THROW
// on any explicit `undefined` value instead of just dropping the field,
// which would otherwise break most submission writes the moment any
// optional field is left unset. getFirestore() doesn't expose this
// option; initializeFirestore() does.
//
// persistentLocalCache keeps what this device already downloaded in
// IndexedDB between app opens, so reopening the app shows data straight
// from the phone and listeners only fetch what changed since, instead of
// re-downloading everything every time (storage/capacity work, see
// docs/PSU_FieldOps_Build_Log_PRD.md §9.2). Multi-tab manager so two open
// tabs share one cache instead of the second one failing. If the browser
// can't use IndexedDB (some private-browsing modes), the SDK falls back to
// memory on its own. The cache is wiped on logout (clearLocalFirestoreCache
// below) so a shared phone never keeps the previous person's data.
export const db: Firestore | null = app
  ? initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;

// Called after sign-out: deletes this device's cached Firestore data, then
// reloads, because a terminated Firestore instance can't be used again.
export async function clearLocalFirestoreCache(): Promise<void> {
  if (!db) return;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.error('Clearing the local Firestore cache failed:', err);
  }
  window.location.reload();
}
// Powers calls to Cloud Functions (see functions/src/index.ts) — e.g.
// reclaimAbandonedSignup, called from authService.ts when a self-signup
// hits an orphaned Auth account. Region must match the Cloud Functions
// (us-central1). Without this, the client can hit the wrong endpoint and
// you get opaque CORS / not-found errors.
export const functions: Functions | null = app ? getFunctions(app, 'us-central1') : null;
// Photo evidence uploads (services/storagePhotoService.ts). Photos went to
// Cloudinary for a while; new ones come here again now that the project is
// on the paid Blaze plan. Older Cloudinary photo URLs keep working as-is.
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

// Explicit rather than relying on the SDK default: keeps people logged in
// across page refreshes and browser restarts (persisted in IndexedDB),
// instead of only for the current tab session.
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Failed to set Firebase Auth persistence:', err);
  });
}
