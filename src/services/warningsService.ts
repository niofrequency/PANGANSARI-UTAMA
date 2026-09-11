// Firestore-backed warnings — same gap as submissionsService.ts covers:
// warnings a Supervisor issues were never written to Firestore at all, so
// an Admin or Manager on a different device would never see them. Warnings
// are simpler than submissions — nothing ever edits one after it's issued
// (see firestore.rules: create only, no update/delete) — so this is just a
// live subscription plus one write function.

import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Warning } from '../types';

export function subscribeWarnings(onChange: (warnings: Warning[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'warnings'),
    (snap) => {
      const warnings: Warning[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Warning, 'id'>),
        id: d.id,
      }));
      onChange(warnings);
    },
    (err) => {
      console.error('subscribeWarnings failed:', err);
    }
  );
}

export async function addWarningDoc(warning: Omit<Warning, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'warnings'), warning);
}
