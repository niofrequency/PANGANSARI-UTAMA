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
// Demo-mode seed data.
//
// None of this has any effect once Firebase is configured (see
// useAppStore.ts) — real accounts, roles, and submissions come from
// Firestore instead. In demo mode (no Firebase env vars set), the app
// otherwise boots as a genuinely empty shell — no fictional staff, no
// pre-built submission history, no sample warnings or training modules.
// Use the Sign Up flow (or Add Staff, once at least one account exists) to
// populate the rest of it from scratch.
//
// The three accounts below are the one deliberate exception: minimal seed
// data so the Scan-to-Job flow (StaffIdGate.tsx, deepLink.ts) has something
// to log into out of the box, in demo mode, with zero setup. This is not
// the fictional cast that used to live here — it's three accounts, no
// submissions, no history, purely so `/go?...` has someone to log in as.
// See README.md for the matching `/go` URLs to try them with.
//
// `pin` is demo-mode-only plaintext (see types.ts / pinHash.ts — Firebase
// mode never stores a raw PIN, only a hash, and never on the `User` type
// at all — this local-only type extension is exactly why loginByStaffCode
// in useAppStore.ts has to read it back off with an `as any`). PIN for all
// three is 1234.
type DemoUser = User & { pin: string };

export const INITIAL_USERS: DemoUser[] = [
  {
    id: 'demo-fs-1',
    firstName: 'Budi',
    lastName: 'Santoso',
    name: 'Budi Santoso',
    email: 'demo.budi@psu.local',
    role: 'FOOD_SAFETY_TECHNICIAN',
    site: 'site-1',
    isActive: true,
    staffCode: 'FS01',
    pin: '1234',
  },
  {
    id: 'demo-fs-2',
    firstName: 'Siti',
    lastName: 'Aminah',
    name: 'Siti Aminah',
    email: 'demo.siti@psu.local',
    role: 'FOOD_SAFETY_TECHNICIAN',
    site: 'site-1',
    isActive: true,
    staffCode: 'FS02',
    pin: '1234',
  },
  {
    id: 'demo-hk-1',
    firstName: 'Andi',
    lastName: 'Wijaya',
    name: 'Andi Wijaya',
    email: 'demo.andi@psu.local',
    role: 'HOUSEKEEPER',
    site: 'site-1',
    isActive: true,
    staffCode: 'HK01',
    pin: '1234',
  },
];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const TRAINING_MODULES: TrainingModule[] = [];

export const INITIAL_WARNINGS: Warning[] = [];
