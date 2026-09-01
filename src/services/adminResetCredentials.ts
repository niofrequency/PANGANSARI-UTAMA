// Thin client wrapper around the adminResetCredentials Cloud Function (see
// functions/src/index.ts). Changing a DIFFERENT account's email or
// password has no client-only path — Firebase Auth's browser SDK can only
// ever change the currently signed-in user's own credentials — so unlike
// adminCreateAccount.ts, this one genuinely needs the Cloud Function
// deployed (`firebase deploy --only functions`) to work.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface ResetCredentialsParams {
  uid: string;
  currentEmail: string;
  newEmail?: string;
  newPassword?: string;
}

export type ResetCredentialsResult =
  | { ok: true }
  | { ok: false; error: 'already-exists' | 'not-found' | 'invalid-argument' | 'not-configured' | 'unknown' };

export async function resetStaffCredentials(
  params: ResetCredentialsParams
): Promise<ResetCredentialsResult> {
  if (!functions) return { ok: false, error: 'not-configured' };
  try {
    const callable = httpsCallable(functions, 'adminResetCredentials');
    await callable(params);
    return { ok: true };
  } catch (err: any) {
    const code = String(err?.code || '').replace('functions/', '');
    if (code === 'already-exists' || code === 'not-found' || code === 'invalid-argument') {
      return { ok: false, error: code };
    }
    console.error('resetStaffCredentials call failed:', err);
    return { ok: false, error: 'unknown' };
  }
}
