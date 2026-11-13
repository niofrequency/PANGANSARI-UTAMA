// One-off reads for the Export screen (components/Export/ExportPanel.tsx).
// Export needs a date range that can reach back further than what the app
// keeps loaded (60 days, see submissionsService.ts), so it queries
// Firestore directly for exactly that range, a page at a time, using the
// same site scoping + composite index as the live queries.

import { collection, getDocs, limit, orderBy, query, startAfter, where, type QueryConstraint, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Submission } from '../types';

const PAGE = 1000;
const MAX_ROWS = 20000;

export async function fetchSubmissionsInRange(
  sites: string[] | 'ALL',
  fromISO: string,
  toISO: string
): Promise<{ submissions: Submission[]; truncated: boolean }> {
  if (!db) return { submissions: [], truncated: false };
  const siteList = sites === 'ALL' ? [] : Array.from(new Set(sites));
  // Firestore's `in` takes 30 values; more than that → query per chunk.
  const chunks: QueryConstraint[][] = siteList.length === 0
    ? [[]]
    : Array.from({ length: Math.ceil(siteList.length / 30) }, (_, i) => [where('siteId', 'in', siteList.slice(i * 30, i * 30 + 30))]);

  const out: Submission[] = [];
  for (const siteC of chunks) {
    let cursor: QueryDocumentSnapshot | null = null;
    for (;;) {
      const q = query(
        collection(db, 'submissions'),
        ...siteC,
        where('timestamp', '>=', fromISO),
        where('timestamp', '<', toISO),
        orderBy('timestamp', 'asc'),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(PAGE)
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => out.push({ ...(d.data() as Omit<Submission, 'id'>), id: d.id }));
      if (out.length >= MAX_ROWS) return { submissions: out.slice(0, MAX_ROWS), truncated: true };
      if (snap.size < PAGE) break;
      cursor = snap.docs[snap.docs.length - 1];
    }
  }
  out.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  return { submissions: out, truncated: false };
}
