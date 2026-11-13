// Missed-check alerts: the schedules an Admin/Manager sets up, and the
// misses the server records against them (functions/src/missedChecks.ts).
// Same shape as the other services: live subscriptions + small writes.

import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckSchedule, MissedCheck } from '../types';

export function subscribeCheckSchedules(onChange: (s: CheckSchedule[]) => void): () => void {
  if (!db) { onChange([]); return () => {}; }
  return onSnapshot(
    collection(db, 'checkSchedules'),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<CheckSchedule, 'id'>), id: d.id }))),
    (err) => console.error('subscribeCheckSchedules failed:', err)
  );
}

// Misses from `sinceDate` (local 'YYYY-MM-DD') onward — a week is plenty
// for the "what was missed" card; this collection only ever grows by a
// handful of docs a day.
export function subscribeMissedChecks(sinceDate: string, onChange: (m: MissedCheck[]) => void): () => void {
  if (!db) { onChange([]); return () => {}; }
  return onSnapshot(
    query(collection(db, 'missedChecks'), where('date', '>=', sinceDate)),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<MissedCheck, 'id'>), id: d.id }))),
    (err) => console.error('subscribeMissedChecks failed:', err)
  );
}

export async function addCheckScheduleDoc(s: Omit<CheckSchedule, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'checkSchedules'), s);
}

export async function updateCheckScheduleDoc(id: string, patch: Partial<Omit<CheckSchedule, 'id'>>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'checkSchedules', id), patch);
}

export async function deleteCheckScheduleDoc(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'checkSchedules', id));
}
