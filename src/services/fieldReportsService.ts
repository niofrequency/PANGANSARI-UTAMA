// Firestore-backed field reports — same gap submissionsService.ts and
// warningsService.ts cover: a "something's broken" report a frontline
// worker files (ReportIssueButton.tsx) was never written to Firestore, so
// a Supervisor/Manager reviewing it (FieldReportsTab.tsx) on a different
// device would never see it, and the filer checking its status
// (MyFieldReports.tsx) on yet another device wouldn't see it get
// acknowledged/resolved either.

import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FieldReport } from '../types';

export function subscribeFieldReports(onChange: (reports: FieldReport[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'fieldReports'),
    (snap) => {
      const reports: FieldReport[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<FieldReport, 'id'>),
        id: d.id,
      }));
      onChange(reports);
    },
    (err) => {
      console.error('subscribeFieldReports failed:', err);
    }
  );
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
