// Firestore-backed submissions — the actual technician-submits/supervisor-
// reviews loop this whole app exists for. Until this file existed,
// submissions (and the sign-off stamps, rejections, and resubmits acting
// on them) lived ONLY in whichever browser created them — never written to
// Firestore at all, even with Firebase fully configured. That meant a
// Supervisor opening the review queue on a different device from the one a
// Technician submitted on would simply never see it: each device was an
// island running its own local copy. This is what actually connects them.
//
// Mirrors usersService.ts's shape: a live subscription for reads, small
// typed functions for writes. Business logic (which sign-off step is
// next, whether a stamp is the final one, chain resets on resubmit) stays
// in useAppStore.ts, same as before — this file is just Firestore I/O.

import { collection, doc, addDoc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Submission } from '../types';

// Live-subscribes to every submission (read access is any signed-in user —
// see firestore.rules; each portal's own screens do their own department/
// site/status filtering client-side, same as before this existed).
// Returns an unsubscribe function.
export function subscribeSubmissions(onChange: (submissions: Submission[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'submissions'),
    (snap) => {
      const submissions: Submission[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Submission, 'id'>),
        id: d.id,
      }));
      onChange(submissions);
    },
    (err) => {
      // Same reasoning as subscribeUsers: surface this instead of letting
      // every queue/history screen silently stay empty forever.
      console.error('subscribeSubmissions failed:', err);
    }
  );
}

export async function addSubmissionDoc(submission: Omit<Submission, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'submissions'), submission);
}

// Generic patch applier — dot-path keys (e.g. 'meta.signoff.checkedBy')
// merge into that nested field only, leaving siblings alone; plain keys
// (e.g. 'status') replace that top-level field. Firestore's updateDoc
// already treats string keys this way natively, so the three call sites
// below (stamp/reject/resubmit in useAppStore.ts) just build the right
// patch object for whichever one they're doing.
export async function updateSubmissionDoc(
  submissionId: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'submissions', submissionId), patch);
}

// ignoreUndefinedProperties (lib/firebase.ts) makes Firestore silently
// SKIP an explicit `undefined` field in a write instead of throwing — but
// "skipped" means "leave whatever's already there," not "clear it."
// Resubmitting needs to actually remove the old rejectionReason, not just
// omit it from the patch, so it uses this sentinel instead.
export const CLEAR_FIELD = deleteField();
