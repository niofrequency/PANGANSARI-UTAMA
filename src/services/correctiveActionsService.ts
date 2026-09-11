// Firestore-backed corrective actions — same subscribe/add/update shape
// as submissionsService.ts/fieldReportsService.ts. See types.ts's
// CorrectiveAction for the two-step closure this collection's update
// rule (firestore.rules) is built around.

import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CorrectiveAction } from '../types';

export function subscribeCorrectiveActions(onChange: (actions: CorrectiveAction[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'correctiveActions'),
    (snap) => {
      const actions: CorrectiveAction[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<CorrectiveAction, 'id'>),
        id: d.id,
      }));
      onChange(actions);
    },
    (err) => {
      console.error('subscribeCorrectiveActions failed:', err);
    }
  );
}

export async function addCorrectiveActionDoc(action: Omit<CorrectiveAction, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'correctiveActions'), action);
}

// Generic patch — covers all three transitions (mark done / verify /
// reopen — see useAppStore.ts), which only ever touch the fields
// firestore.rules' update rule allows for whichever transition it is.
export async function updateCorrectiveActionDoc(
  actionId: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'correctiveActions', actionId), patch);
}
