// Offline outbox for addSubmission (useAppStore.ts) — Firebase mode only.
// Firestore here has no persistent local cache configured (see
// lib/firebase.ts's initializeFirestore call), so a submission filed with
// no network today just silently fails: addSubmissionDoc's fire-and-forget
// write rejects, gets logged, and is gone. On a mess-hall floor where Wi-Fi
// drops mid-shift, that's a lost checklist with no sign anything went
// wrong.
//
// This is a QUEUE, not a second source of truth: nothing ever reads this
// table to decide what's shown on screen — Zustand's `submissions` state,
// populated by Firestore's own live subscription, stays the only thing
// any portal/queue/history screen ever renders. An entry here just means
// "this payload hasn't reached Firestore yet"; the moment it does, the
// entry is deleted and the submission shows up the normal way, through
// the subscription, like it always has.
//
// Demo mode (no Firebase configured) never touches this at all — its
// addSubmission already writes straight to localStorage synchronously,
// which can't fail from a dropped Wi-Fi connection in the first place.
import Dexie, { type Table } from 'dexie';

export interface OutboxEntry {
  id: string;
  type: 'submission';
  payload: unknown;
  createdAt: string;
  status: 'pending';
}

class OutboxDatabase extends Dexie {
  outbox!: Table<OutboxEntry, string>;
  constructor() {
    super('psu_outbox_v1');
    this.version(1).stores({ outbox: 'id, status, createdAt' });
  }
}

export const outboxDb = new OutboxDatabase();
