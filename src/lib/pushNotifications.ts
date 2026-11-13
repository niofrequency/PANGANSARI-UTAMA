import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { app, db } from './firebase';

// Chat push notifications via Firebase Cloud Messaging.
//
// Each device that allows notifications gets an FCM token, stored at
// pushTokens/{token} = { uid, email, ... }. The notifyChatMessage Cloud
// Function (functions/src/index.ts) looks up the recipient's tokens when a
// chat message is created and sends the push; public/sw.js shows it.
//
// Needs VITE_FIREBASE_VAPID_KEY (Firebase Console → Project Settings →
// Cloud Messaging → Web Push certificates → key pair). Without it, push is
// simply unavailable and the in-app unread badges still work.
//
// iPhone/iPad: web push only works once the app is installed to the Home
// Screen (iOS 16.4+), not in a Safari tab.

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_KEY = 'psu_push_token_v1';

export type PushState = 'unsupported' | 'not-configured' | 'default' | 'granted' | 'denied';

export async function pushState(): Promise<PushState> {
  if (!app || !db || typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  if (!VAPID_KEY) return 'not-configured';
  return Notification.permission as PushState;
}

// Gets (or refreshes) this device's token and saves it for `uid`. Only
// prompts for permission when `prompt` is true — i.e. from a button tap,
// which browsers require.
export async function registerPush(uid: string, email: string, prompt: boolean): Promise<PushState> {
  const state = await pushState();
  if (state === 'unsupported' || state === 'not-configured' || state === 'denied') return state;
  if (state === 'default') {
    if (!prompt) return state;
    const result = await Notification.requestPermission();
    if (result !== 'granted') return result as PushState;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app!), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return 'default';
    await setDoc(doc(db!, 'pushTokens', token), {
      uid,
      email: email.toLowerCase(),
      userAgent: navigator.userAgent.slice(0, 200),
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(TOKEN_KEY, token);
    return 'granted';
  } catch (err) {
    console.error('registerPush failed:', err);
    return 'granted';
  }
}

// On logout: stop sending this account's chats to this device.
export async function unregisterPush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || !app || !db) return;
  localStorage.removeItem(TOKEN_KEY);
  try {
    await deleteDoc(doc(db, 'pushTokens', token));
    await deleteToken(getMessaging(app));
  } catch (err) {
    console.error('unregisterPush failed:', err);
  }
}

// Unread count on the installed app's icon (Android/desktop Chrome, and
// iOS 16.4+ Home Screen apps). No-op where unsupported.
export function setAppBadgeCount(count: number): void {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    // ignore
  }
}
