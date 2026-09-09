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
// Staff ID alone logs someone in — no PIN in this flow (see
// authService.ts's loginByStaffCode and StaffIdGate.tsx).
export const INITIAL_USERS: User[] = [
  {
    id: 'demo-fs-1',
    firstName: 'Budi',
    lastName: 'Santoso',
    name: 'Budi Santoso',
    email: 'demo.budi@psu.local',
    role: 'FOOD_SAFETY_TECHNICIAN',
    site: 'site-1',
    isActive: true,
    staffCode: '1001',
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
    staffCode: '1002',
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
    staffCode: '2001',
  },
];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const TRAINING_MODULES: TrainingModule[] = [];

export const INITIAL_WARNINGS: Warning[] = [];
