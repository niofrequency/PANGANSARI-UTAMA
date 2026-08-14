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
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
