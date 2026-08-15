// Thin client wrapper around the createStaffAccount Cloud Function (see
// functions/src/index.ts). Kept separate from usersService.ts because
// this one calls a Cloud Function (server-side, Admin SDK) rather than
// reading/writing Firestore directly from the browser.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { UserRole } from '../types';

export interface CreateStaffAccountParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  site: string;
}

export type CreateStaffAccountResult =
  | { ok: true }
  | { ok: false; error: 'already-exists' | 'invalid-argument' | 'not-configured' | 'unknown' };

export async function createStaffAccount(
  params: CreateStaffAccountParams
): Promise<CreateStaffAccountResult> {
  if (!functions) {
    return { ok: false, error: 'not-configured' };
  }
  try {
    const callable = httpsCallable(functions, 'createStaffAccount');
    await callable(params);
    return { ok: true };
  } catch (err: any) {
    // httpsCallable errors carry the HttpsError code from the function,
    // prefixed with "functions/" (e.g. "functions/already-exists").
    const code = String(err?.code || '').replace('functions/', '');
    if (code === 'already-exists' || code === 'invalid-argument') {
      return { ok: false, error: code };
    }
    console.error('createStaffAccount call failed:', err);
    return { ok: false, error: 'unknown' };
  }
}
