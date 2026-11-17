import { toast } from 'sonner';
import { translations } from '../i18n/translations';
import { captureToSentry } from './sentry';

// Turns a failed log action (stamp / send back / fix / edit / delete) into
// a toast the person can act on, in their chosen language. Error messages
// are lib/logLifecycle.ts StampProblem codes or Firestore error codes.
function lang(): 'en' | 'id' {
  try { return localStorage.getItem('psu_language') === 'id' ? 'id' : 'en'; } catch { return 'en'; }
}

export function logErrorMessage(err: unknown): string {
  const m = translations[lang()].logErrors as Record<string, string>;
  const code = String((err as { code?: string })?.code || (err as Error)?.message || '');
  if (code in m) return m[code];
  if (/unavailable|network|offline|deadline/i.test(code)) return m.offline;
  if (/permission/i.test(code)) return m['permission-denied'];
  return m.generic;
}

export function reportLogError(err: unknown) {
  console.error('action failed:', err);
  toast.error(logErrorMessage(err));
  // Being offline is expected in the field — everything else is worth a look.
  const code = String((err as { code?: string })?.code || (err as Error)?.message || '');
  if (!/unavailable|network|offline|deadline|already-stamped|not-pending|stamped-other-step|out-of-order|own-log/i.test(code)) captureToSentry(err);
}

// Submitted with no connection: reassure, so nobody submits twice.
export function notifySavedOffline() {
  toast.success((translations[lang()].logOk as Record<string, string>).savedOffline);
}
