import { User, Site, Submission, TrainingModule, Warning } from '../types';

// Edit this with your real site(s)/location(s) — the Admin Portal doesn't
// yet have a "manage sites" UI, so site selection in Add Staff / analytics
// both read from this list. Once you add real sites here, redeploy.
export const SITES: Site[] = [
  { id: 'site-1', name: 'Main Site', location: '' },
  { id: 'site-townsite', name: 'Townsite Office', location: '' },
  { id: 'site-campservices', name: '68 Camp Services', location: '' },
  { id: 'site-lupalelah', name: '68 Lupa Lelah Club', location: '' },
  { id: 'site-melatibakery', name: '68 Melati Central Bakery', location: '' },
  { id: 'site-melatimess', name: '68 Melati Mess Hall', location: '' },
  { id: 'site-mawarmess', name: '68 Mawar Mess Hall', location: '' },
  { id: 'site-spcs', name: 'SPCS', location: '' },
];

// ---------------------------------------------------------------------------
// Demo-mode seed data — intentionally empty.
//
// None of this has any effect once Firebase is configured (see
// useAppStore.ts) — real accounts, roles, and submissions come from
// Firestore instead. In demo mode (no Firebase env vars set), the app now
// boots as a genuinely empty shell: no fictional staff, no pre-built
// submission history, no sample warnings or training modules. Use the
// Sign Up flow (or Add Staff, once at least one account exists) to
// populate it from scratch.
// ---------------------------------------------------------------------------

export const INITIAL_USERS: User[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const TRAINING_MODULES: TrainingModule[] = [];

export const INITIAL_WARNINGS: Warning[] = [];
