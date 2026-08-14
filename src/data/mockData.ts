import { User, Site, Submission, TrainingModule, Warning } from '../types';

// Edit this with your real site(s)/location(s) — this is the only sample
// data left, since the Admin Portal doesn't yet have a "manage sites" UI
// (site selection in Add Staff / analytics both read from this list).
// Once you add real sites here, redeploy.
export const SITES: Site[] = [
  { id: 'site-1', name: 'Main Site', location: '' },
];

// Demo-mode fallback only (no effect if Firebase is configured — real
// accounts come from Firestore instead, see useAppStore.ts).
export const INITIAL_USERS: User[] = [];

// Demo-mode fallback only. No seeded training modules — add real ones
// from Firestore (trainings collection) or wire up an admin UI for it.
export const TRAINING_MODULES: TrainingModule[] = [];

// Demo-mode fallback only. Starts empty — no fake submission history.
export const INITIAL_SUBMISSIONS: Submission[] = [];
