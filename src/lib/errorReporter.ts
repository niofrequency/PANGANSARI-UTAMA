// App-side error monitoring (no third-party service). Uncaught errors,
// unhandled promise rejections and React render crashes (ErrorBoundary)
// are written to Firestore `appErrors`, where the errorDigest Cloud
// Function (functions/src/monitoring.ts) groups them hourly, pushes a
// notification to Admins when a NEW kind of error appears or errors
// spike, and Admin > Analytics shows an "App health" list.
//
// Deliberately conservative: only signed-in sessions report (the rules
// require it), at most 10 reports per page load, each distinct error once
// per page load, no query strings or form contents — just the message,
// stack, which screen, role and app version.

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

const MAX_PER_PAGE = 10;
const seen = new Set<string>();
let sent = 0;
let currentRole = '';

export function setErrorReporterRole(role: string | undefined) {
  currentRole = role || '';
}

// Noise that isn't ours to fix (browser quirks, extensions, cross-origin
// scripts that hide their message).
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /AbortError/i];

export function fingerprintOf(message: string, stack?: string): string {
  const frame = (stack || '').split('\n').find((l) => /\bat\b|@/.test(l)) || '';
  // Strip line/column numbers and hashed bundle names so the same bug in
  // a new build groups together.
  const norm = `${message}|${frame}`.replace(/:\d+:\d+/g, '').replace(/-[A-Za-z0-9_]{8}\.js/g, '.js').slice(0, 300);
  let h = 2166136261;
  for (let i = 0; i < norm.length; i++) { h ^= norm.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function reportError(err: unknown, kind: 'error' | 'rejection' | 'render' = 'error'): void {
  try {
    if (!isFirebaseConfigured || !db || !auth?.currentUser) return;
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err ?? 'unknown'));
    const message = String(e.message || e.name || 'Unknown error').slice(0, 500);
    if (IGNORE.some((re) => re.test(message))) return;
    const stack = String(e.stack || '').slice(0, 2000);
    const fingerprint = fingerprintOf(message, stack);
    if (seen.has(fingerprint) || sent >= MAX_PER_PAGE) return;
    seen.add(fingerprint);
    sent++;
    addDoc(collection(db, 'appErrors'), {
      source: 'app',
      kind,
      fingerprint,
      message,
      stack,
      path: window.location.pathname,
      uid: auth.currentUser.uid,
      role: currentRole.slice(0, 40),
      appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
      userAgent: navigator.userAgent.slice(0, 200),
      createdAt: serverTimestamp(),
    }).catch(() => { /* never let reporting itself cause trouble */ });
  } catch {
    // ignore
  }
}

export function installErrorReporting(): void {
  window.addEventListener('error', (ev) => reportError(ev.error || ev.message, 'error'));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'rejection'));
}
