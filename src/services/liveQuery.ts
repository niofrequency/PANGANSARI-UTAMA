import { collection, onSnapshot, query, type QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Live-subscribes to several bounded queries on one collection and hands
// back their union (by doc id). This is how every collection is loaded
// now: each person only listens to the slices they actually need (their
// own records, what's open, a recent window) instead of a whole
// collection — the difference between a phone downloading a few hundred
// docs and tens of thousands once ~1,000 staff use the app daily.
//
// Emits once every slice has answered once (no half-filled first
// render), then on every change. A slice that fails (e.g. a composite
// index still building right after a deploy) is logged and treated as
// empty — never retried as a wider, unbounded query.
export function listenMerged<T extends { id: string }>(
  path: string,
  slices: QueryConstraint[][],
  map: (id: string, data: unknown) => T,
  onChange: (items: T[]) => void,
  label: string,
): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  if (slices.length === 0) {
    onChange([]);
    return () => {};
  }
  const col = collection(db, path);
  const results: (T[] | null)[] = slices.map(() => null);
  const emit = () => {
    if (results.some((r) => r === null)) return;
    const byId = new Map<string, T>();
    for (const r of results) for (const item of r!) byId.set(item.id, item);
    onChange(Array.from(byId.values()));
  };
  const unsubs = slices.map((constraints, i) =>
    onSnapshot(
      query(col, ...constraints),
      (snap) => {
        results[i] = snap.docs.map((d) => map(d.id, d.data()));
        emit();
      },
      (err) => {
        console.error(`${label} (slice ${i}) failed:`, err);
        results[i] = [];
        emit();
      },
    ),
  );
  return () => unsubs.forEach((u) => u());
}

// Firestore `in` takes at most 30 values (and the product of two `in`
// filters must stay ≤ 30) — split a list into chunks that fit.
export function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}
