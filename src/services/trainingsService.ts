// Firestore-backed training modules — same live-sync gap as
// submissions/warnings/fieldReports, with one difference: nothing in this
// app currently creates or deletes a training module (there's no
// addTrainingModule/deleteTrainingModule in useAppStore.ts, and
// TRAINING_MODULES in mockData.ts is empty) — firestore.rules already
// scopes create/delete to isAdmin(), on the assumption a module gets
// added directly in the Firebase Console rather than through an in-app
// form. This file only ever reads the collection and marks the CURRENT
// user complete on one module — nothing else.

import { arrayUnion, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrainingModule } from '../types';

export function subscribeTrainings(onChange: (trainings: TrainingModule[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'trainings'),
    (snap) => {
      const trainings: TrainingModule[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<TrainingModule, 'id'>),
        id: d.id,
      }));
      onChange(trainings);
    },
    (err) => {
      console.error('subscribeTrainings failed:', err);
    }
  );
}

// arrayUnion, not a full array overwrite — firestore.rules' update rule
// requires completedBy to grow by exactly one entry, the caller's own
// uid, which arrayUnion already guarantees (a duplicate is a no-op, never
// a second copy) and a client-computed array replacement wouldn't if two
// people completed the same module at nearly the same moment.
export async function completeTrainingDoc(moduleId: string, userId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'trainings', moduleId), { completedBy: arrayUnion(userId) });
}
