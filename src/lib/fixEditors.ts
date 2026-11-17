import { useEffect, useRef } from 'react';
import { Submission } from '../types';

// "Fix it" plumbing for logs sent back to the person who filed them.
// The Needs-fixing banner / bell / push notification opens the log as a
// page (App.tsx's fix page); its "Edit & resend" button hands the log to
// whichever portal on screen knows how to edit that kind of log — each
// portal registers its own editor here with useFixEditor(). Logs with no
// editor (e.g. an earlier day's Temperature Control sheet) are resolved
// with "Fixed — send back for review" plus a note instead.
type Editor = { canEdit: (s: Submission) => boolean; edit: (s: Submission) => void };
const editors = new Set<{ current: Editor }>();

export function useFixEditor(canEdit: Editor['canEdit'], edit: Editor['edit']) {
  const ref = useRef<Editor>({ canEdit, edit });
  ref.current = { canEdit, edit };
  useEffect(() => {
    editors.add(ref);
    return () => { editors.delete(ref); };
  }, []);
}

export function findFixEditor(s: Submission): Editor | undefined {
  for (const r of editors) if (r.current.canEdit(s)) return r.current;
  return undefined;
}

// Opens App.tsx's fix page for one of the signed-in user's sent-back logs
// (used by the portals' Rejected tab).
export function openFixPage(id: string) {
  window.dispatchEvent(new CustomEvent('psu-open-fix', { detail: id }));
}
