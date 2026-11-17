// Firestore-backed field reports — same gap submissionsService.ts and
// warningsService.ts cover: a "something's broken" report a frontline
// worker files (ReportIssueButton.tsx) was never written to Firestore, so
// a Supervisor/Manager reviewing it (FieldReportsTab.tsx) on a different
// device would never see it, and the filer checking its status
// (MyFieldReports.tsx) on yet another device wouldn't see it get
// acknowledged/resolved either.

import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { listenMerged } from './liveQuery';
import type { QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FieldReport } from '../types';

// `slices` = this person's share (lib/dataScope.ts); default = all.
export function subscribeFieldReports(onChange: (items: FieldReport[]) => void, slices: QueryConstraint[][] = [[]]): () => void {
  return listenMerged<FieldReport>('fieldReports', slices, (id, data) => ({ ...(data as Omit<FieldReport, 'id'>), id }), onChange, 'subscribeFieldReports');
}

export async function addFieldReportDoc(report: Omit<FieldReport, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'fieldReports'), report);
}

// Generic patch — covers both acknowledge and resolve (see
// useAppStore.ts's acknowledgeFieldReport/resolveFieldReport), which only
// ever touch the reviewer-facing fields firestore.rules' update rule
// allows, never the original message/photo.
export async function updateFieldReportDoc(
  reportId: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'fieldReports', reportId), patch);
}
