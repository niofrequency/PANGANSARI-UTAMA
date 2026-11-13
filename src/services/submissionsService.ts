// Firestore-backed submissions — the actual technician-submits/supervisor-
// reviews loop this whole app exists for. Mirrors usersService.ts's shape:
// a live subscription for reads, small typed functions for writes.
// Business logic (which sign-off step is next, whether a stamp is the final
// one, chain resets on resubmit) stays in useAppStore.ts — this file is
// just Firestore I/O.
//
// SCOPED READS (storage/capacity work, see docs/PSU_FieldOps_Build_Log_PRD.md
// §9.2): this used to live-subscribe to the ENTIRE collection on every
// device, so every app open downloaded every submission ever filed, and
// Firestore reads grew as users × all-time submissions. Now each device
// only keeps a live listener on:
//
//   1. the last LIVE_WINDOW_DAYS days, and
//   2. anything still PENDING review, however old (so an old item in a
//      review queue never silently disappears),
//
// both limited to the sites this user can see (lib/siteScope.ts) when that
// list is small enough for a Firestore `in` filter. Older history is
// fetched on demand, a page at a time (fetchOlderSubmissions below), only
// when someone actually asks for it from a History screen.
//
// firestore.rules didn't need to change: read access is still "any signed-
// in user", and these are just narrower queries within it.
// firestore.indexes.json holds the composite indexes the site-filtered
// queries need.

import {
  collection, doc, addDoc, updateDoc, deleteField, onSnapshot, getDocs,
  query, where, orderBy, limit, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Submission } from '../types';

export const LIVE_WINDOW_DAYS = 60;
export const OLDER_PAGE_SIZE = 300;
// Firestore's `in` filter takes at most 30 values. A user scoped to more
// sites than that (rare: a hand-picked list) just isn't site-filtered at
// the query level; each portal still filters by site client-side, exactly
// as it always has.
const MAX_IN_VALUES = 30;

export interface SubmissionScope {
  sites: string[] | 'ALL';
}

function siteConstraint(scope: SubmissionScope): QueryConstraint[] {
  if (scope.sites === 'ALL') return [];
  const sites = Array.from(new Set(scope.sites.filter(Boolean)));
  if (sites.length === 0 || sites.length > MAX_IN_VALUES) return [];
  return [where('siteId', 'in', sites)];
}

export function liveWindowStartISO(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - LIVE_WINDOW_DAYS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toSubmissions(docs: { id: string; data: () => unknown }[]): Submission[] {
  return docs.map((d) => ({ ...(d.data() as Omit<Submission, 'id'>), id: d.id }));
}

// Live-subscribes to this user's recent + still-open submissions (see the
// file header). `sinceISO` is the start of the live window, passed in so
// the caller (useAppStore.ts) knows exactly where "older" history begins.
// Returns an unsubscribe function.
export function subscribeSubmissions(
  scope: SubmissionScope,
  sinceISO: string,
  onChange: (submissions: Submission[]) => void
): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const col = collection(db, 'submissions');

  let recent: Submission[] = [];
  let pending: Submission[] = [];
  let recentReady = false;
  let pendingReady = false;
  let stopped = false;

  const emit = () => {
    // Wait for both first answers so screens don't flash a half list.
    if (!recentReady || !pendingReady) return;
    const byId = new Map<string, Submission>();
    for (const s of pending) byId.set(s.id, s);
    for (const s of recent) byId.set(s.id, s); // recent wins: same doc, same data
    onChange(Array.from(byId.values()));
  };

  // One listener with a site-filtered query. If Firestore says the
  // composite index it needs isn't ready (failed-precondition: right
  // after a deploy, while firestore.indexes.json is still building), it
  // re-subscribes without the site filter — the old, wider read — rather
  // than leaving the screen empty. Client-side site filtering in each
  // portal keeps what people see the same either way.
  const listen = (
    label: string,
    build: (sites: QueryConstraint[]) => ReturnType<typeof query>,
    onDocs: (docs: Submission[]) => void
  ): (() => void) => {
    let unsub: () => void = () => {};
    const start = (sites: QueryConstraint[]) => {
      unsub = onSnapshot(
        build(sites),
        (snap) => onDocs(toSubmissions(snap.docs)),
        (err) => {
          const code = (err as { code?: string }).code;
          if (code === 'failed-precondition' && sites.length > 0 && !stopped) {
            console.warn(`subscribeSubmissions (${label}): index not ready yet, using unfiltered query for now`);
            start([]);
            return;
          }
          // Surface this instead of letting every queue/history screen
          // silently stay empty forever.
          console.error(`subscribeSubmissions (${label}) failed:`, err);
        }
      );
    };
    start(siteConstraint(scope));
    return () => unsub();
  };

  const unsubRecent = listen(
    'recent',
    (sites) => query(col, ...sites, where('timestamp', '>=', sinceISO)),
    (docs) => { recent = docs; recentReady = true; emit(); }
  );
  const unsubPending = listen(
    'pending',
    (sites) => query(col, ...sites, where('status', '==', 'PENDING')),
    (docs) => { pending = docs; pendingReady = true; emit(); }
  );
  return () => { stopped = true; unsubRecent(); unsubPending(); };
}

// One page of history older than `beforeISO`, newest first. Not live: old
// records are effectively finished, and a one-off read costs a fraction of
// a listener that re-reads them on every app open. `hasMore` is false once
// a page comes back short.
export async function fetchOlderSubmissions(
  scope: SubmissionScope,
  beforeISO: string,
  pageSize = OLDER_PAGE_SIZE
): Promise<{ submissions: Submission[]; hasMore: boolean }> {
  if (!db) return { submissions: [], hasMore: false };
  const col = collection(db, 'submissions');
  const build = (sites: QueryConstraint[]) =>
    query(col, ...sites, where('timestamp', '<', beforeISO), orderBy('timestamp', 'desc'), limit(pageSize));
  let snap;
  try {
    snap = await getDocs(build(siteConstraint(scope)));
  } catch (err) {
    // Same index-still-building fallback as subscribeSubmissions.
    if ((err as { code?: string }).code !== 'failed-precondition') throw err;
    snap = await getDocs(build([]));
  }
  return { submissions: toSubmissions(snap.docs), hasMore: snap.size === pageSize };
}

export async function addSubmissionDoc(submission: Omit<Submission, 'id'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'submissions'), submission);
}

// Generic patch applier — dot-path keys (e.g. 'meta.signoff.checkedBy')
// merge into that nested field only, leaving siblings alone; plain keys
// (e.g. 'status') replace that top-level field. Firestore's updateDoc
// already treats string keys this way natively, so the three call sites
// (stamp/reject/resubmit in useAppStore.ts) just build the right patch
// object for whichever one they're doing.
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
