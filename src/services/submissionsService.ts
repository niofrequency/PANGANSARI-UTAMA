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

import { listenMerged } from './liveQuery';
import {
  collection, doc, addDoc, updateDoc, deleteField, onSnapshot, getDocs, runTransaction, arrayUnion,
  query, where, orderBy, limit, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Submission } from '../types';
import { LogEvent, chainOf, stampProblem } from '../lib/logLifecycle';
import { SignoffStep } from '../data/opsLogsCatalog';

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

export function liveWindowStartISO(now = new Date(), days = LIVE_WINDOW_DAYS): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
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
// Live-subscribes to this person's share of submissions — the slices
// from lib/dataScope.ts's submissionSlices (own records, their sites'
// recent window and open items, or a frontline worker's shared monthly
// sheets). Returns an unsubscribe function.
export function subscribeSubmissions(
  slices: QueryConstraint[][],
  onChange: (submissions: Submission[]) => void,
): () => void {
  return listenMerged<Submission>('submissions', slices, (id, data) => ({ ...(data as Omit<Submission, 'id'>), id }), onChange, 'subscribeSubmissions');
}

// One page of history older than `beforeISO`, newest first. Not live: old
// records are effectively finished, and a one-off read costs a fraction of
// a listener that re-reads them on every app open. `hasMore` is false once
// a page comes back short.
export async function fetchOlderSubmissions(
  scope: SubmissionScope,
  beforeISO: string,
  pageSize = OLDER_PAGE_SIZE,
  // Frontline: only their own older logs, not their whole site's.
  ownUid?: string,
): Promise<{ submissions: Submission[]; hasMore: boolean }> {
  if (!db) return { submissions: [], hasMore: false };
  const col = collection(db, 'submissions');
  const filter = ownUid ? [where('userId', '==', ownUid)] : siteConstraint(scope);
  // Always paged (limit) — never an unbounded read, even with no site filter.
  const snap = await getDocs(query(col, ...filter, where('timestamp', '<', beforeISO), orderBy('timestamp', 'desc'), limit(pageSize)));
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

// Stamps one sign-off step inside a transaction, so two reviewers acting
// at the same moment can't both "win" (the second one is told it's
// already stamped instead of silently overwriting), and the stamp is
// checked against the live document — not the possibly-stale copy on
// screen — with the same rules as lib/logLifecycle.ts's stampProblem.
// Appends the history event in the same write.
export async function stampSubmissionTx(
  submissionId: string,
  step: SignoffStep,
  stamp: { userId: string; [k: string]: unknown },
  event: LogEvent,
): Promise<'stamped' | 'approved'> {
  if (!db) return 'stamped';
  const ref = doc(db, 'submissions', submissionId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('not-found');
    const live = { ...(snap.data() as Omit<Submission, 'id'>), id: snap.id } as Submission;
    const problem = stampProblem(live, stamp.userId, step);
    if (problem) throw new Error(problem);
    const chain = chainOf(live);
    const isFinal = chain[chain.length - 1] === step;
    tx.update(ref, {
      [`meta.signoff.${step}`]: stamp,
      'meta.history': arrayUnion(event),
      ...(isFinal ? { status: 'APPROVED', wasApprovedBeforeEdit: false } : {}),
    });
    return isFinal ? 'approved' : 'stamped';
  });
}

export const appendHistory = (event: LogEvent) => arrayUnion(event);

// One site's sheets of one form for one month — for printing / viewing a
// monthly sheet (Temperature Control, Dishwashing, Mess Hall) whose days
// fall outside the live window. Small, exact query (siteId + type +
// timestamp index).
export async function fetchMonthSheets(siteId: string, type: Submission['type'], fromISO: string, toISO: string): Promise<Submission[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'submissions'),
    where('siteId', '==', siteId), where('type', '==', type),
    where('timestamp', '>=', fromISO), where('timestamp', '<', toISO), limit(2000)));
  return toSubmissions(snap.docs);
}
