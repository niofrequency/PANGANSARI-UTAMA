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
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
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
export const db: Firestore | null = app ? getFirestore(app) : null;
// Powers calls to Cloud Functions (see functions/src/index.ts) — e.g. the
// Admin Portal creating a staff account with a set password, which the
// browser-only SDK can never do on its own (see that file for why).
// Region must match the Cloud Function (us-central1). Without this, the
// client can hit the wrong endpoint and you get opaque CORS / not-found errors.
export const functions: Functions | null = app ? getFunctions(app, 'us-central1') : null;
// Photo evidence (Housekeeping checklist items, the Technician's daily
// log) uploads here instead of being embedded as base64 in submissions
// when Firebase is configured — see services/storageService.ts and
// storage.rules. In demo mode, photos stay as local data URLs; there's no
// bucket to upload to.
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

// Explicit rather than relying on the SDK default: keeps people logged in
// across page refreshes and browser restarts (persisted in IndexedDB),
// instead of only for the current tab session.
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Failed to set Firebase Auth persistence:', err);
  });
}
