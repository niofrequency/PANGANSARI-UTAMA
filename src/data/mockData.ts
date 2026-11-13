import { User, Site, Submission, TrainingModule, Warning, FieldReport, CorrectiveAction } from '../types';

// Edit this with your real site(s)/location(s) — the Admin Portal doesn't
// yet have a "manage sites" UI, so site selection in Add Staff / analytics
// both read from this list. Once you add real sites here, redeploy.
// PSU's real work locations (LOKASI KERJA in the HR employee list), one
// site each. `area` groups them in site pickers (the number = township
// mile area; PS/BC/KK/HL/LL/GRS = other areas); `kind` is the main kind of
// work done there. The six locations that already existed keep their old
// ids so existing users and submissions stay attached to them.
// 'site-1' (Main Site) and 'site-spcs' (SPCS) predate this list and are
// kept for accounts/history already assigned to them.
export const SITES: Site[] = [
  { id: 'loc-32-lip-food-warehouse', name: '32 Lip Food Warehouse', location: '32 LIP FOOD WAREHOUSE', area: '32', kind: 'warehouse' },
  { id: 'loc-38-camp-services', name: '38 Camp Services', location: '38 CAMP SERVICES', area: '38', kind: 'camp' },
  { id: 'loc-38-catering', name: '38 Catering', location: '38 CATERING', area: '38', kind: 'kitchen' },
  { id: 'loc-38-laundry', name: '38 Laundry', location: '38 LAUNDRY', area: '38', kind: 'laundry' },
  { id: 'loc-66-coffee-shop', name: '66 Coffee Shop', location: '66 COFFEE SHOP', area: '66', kind: 'kitchen' },
  { id: 'loc-66-coreshed', name: '66 Coreshed', location: '66 CORESHED', area: '66', kind: 'other' },
  { id: 'site-campservices', name: '68 Camp Services', location: '68 CAMP SERVICES', area: '68', kind: 'camp' },
  { id: 'loc-68-food-warehouse', name: '68 Food Warehouse', location: '68 FOOD WAREHOUSE', area: '68', kind: 'warehouse' },
  { id: 'loc-68-gcs', name: '68 GCS', location: '68 GCS', area: '68', kind: 'cleaning' },
  { id: 'loc-68-laundry', name: '68 Laundry', location: '68 LAUNDRY', area: '68', kind: 'laundry' },
  { id: 'site-lupalelah', name: '68 Lupa Lelah Club', location: '68 LUPA LELAH CLUB', area: '68', kind: 'kitchen' },
  { id: 'site-mawarmess', name: '68 Mawar Mess Hall', location: '68 MAWAR MESS HALL', area: '68', kind: 'kitchen' },
  { id: 'site-melatibakery', name: '68 Melati Central Bakery', location: '68 MELATI CENTRAL BAKERY', area: '68', kind: 'kitchen' },
  { id: 'site-melatimess', name: '68 Melati Mess Hall', location: '68 MELATI MESS HALL', area: '68', kind: 'kitchen' },
  { id: 'loc-68-post-office', name: '68 Post Office', location: '68 POST OFFICE', area: '68', kind: 'office' },
  { id: 'loc-68-sgh', name: '68 SGH', location: '68 SGH', area: '68', kind: 'other' },
  { id: 'loc-68-sport-rechall', name: '68 Sport & Rechall', location: '68 SPORT & RECHALL', area: '68', kind: 'sport' },
  { id: 'loc-72-camp-services', name: '72 Camp Services', location: '72 CAMP SERVICES', area: '72', kind: 'camp' },
  { id: 'loc-72-cleaner-superblock', name: '72 Cleaner Superblock', location: '72 CLEANER SUPERBLOCK', area: '72', kind: 'cleaning' },
  { id: 'loc-72-gcs', name: '72 GCS', location: '72 GCS', area: '72', kind: 'cleaning' },
  { id: 'loc-72-kenanga-mess-hall', name: '72 Kenanga Mess Hall', location: '72 KENANGA MESS HALL', area: '72', kind: 'kitchen' },
  { id: 'loc-72-laundry', name: '72 Laundry', location: '72 LAUNDRY', area: '72', kind: 'laundry' },
  { id: 'loc-72-sport-rechall', name: '72 Sport & Rechall', location: '72 SPORT & RECHALL', area: '72', kind: 'sport' },
  { id: 'loc-74-gcs', name: '74 GCS', location: '74 GCS', area: '74', kind: 'cleaning' },
  { id: 'loc-74-gcs-u-g', name: '74 GCS U/G', location: '74 GCS U/G', area: '74', kind: 'cleaning' },
  { id: 'loc-bc-camp-services', name: 'BC Camp Services', location: 'BC CAMP SERVICES', area: 'BC', kind: 'camp' },
  { id: 'loc-bc-catering', name: 'BC Catering', location: 'BC CATERING', area: 'BC', kind: 'kitchen' },
  { id: 'loc-bc-laundry', name: 'BC Laundry', location: 'BC LAUNDRY', area: 'BC', kind: 'laundry' },
  { id: 'loc-bc-sport-rechall', name: 'BC Sport & Rechall', location: 'BC SPORT & RECHALL', area: 'BC', kind: 'sport' },
  { id: 'loc-grs-edelweiss-mess-hall', name: 'GRS Edelweiss Mess Hall', location: 'GRS EDELWEISS MESS HALL', area: 'GRS', kind: 'kitchen' },
  { id: 'loc-grs-gcs', name: 'GRS GCS', location: 'GRS GCS', area: 'GRS', kind: 'cleaning' },
  { id: 'loc-hl-landscape', name: 'HL Landscape', location: 'HL LANDSCAPE', area: 'HL', kind: 'maintenance' },
  { id: 'loc-hl-library', name: 'HL Library', location: 'HL LIBRARY', area: 'HL', kind: 'library' },
  { id: 'loc-hl-library-superblock', name: 'HL Library Superblock', location: 'HL LIBRARY SUPERBLOCK', area: 'HL', kind: 'library' },
  { id: 'loc-hl-maintenance', name: 'HL Maintenance', location: 'HL MAINTENANCE', area: 'HL', kind: 'maintenance' },
  { id: 'loc-hotel-rimba-papua', name: 'Hotel Rimba Papua', location: 'HOTEL RIMBA PAPUA', area: 'HOTEL', kind: 'hotel' },
  { id: 'loc-kk-helikonia-mess-hall', name: 'KK Helikonia Mess Hall', location: 'KK HELIKONIA MESS HALL', area: 'KK', kind: 'kitchen' },
  { id: 'loc-kk-housekeeping', name: 'KK Housekeeping', location: 'KK HOUSEKEEPING', area: 'KK', kind: 'camp' },
  { id: 'loc-kk-library', name: 'KK Library', location: 'KK LIBRARY', area: 'KK', kind: 'library' },
  { id: 'loc-kk-papua-cafe', name: 'KK Papua Café', location: 'KK PAPUA CAFÉ', area: 'KK', kind: 'kitchen' },
  { id: 'loc-kk-sport-rechall', name: 'KK Sport & Rechall', location: 'KK SPORT & RECHALL', area: 'KK', kind: 'sport' },
  { id: 'loc-ll-maintenance', name: 'LL Maintenance', location: 'LL MAINTENANCE', area: 'LL', kind: 'maintenance' },
  { id: 'loc-ps-camp-services', name: 'PS Camp Services', location: 'PS CAMP SERVICES', area: 'PS', kind: 'camp' },
  { id: 'loc-ps-camp-services-lngpp-project', name: 'PS Camp Services LNGPP Project', location: 'PS CAMP SERVICES LNGPP PROJECT', area: 'PS', kind: 'camp' },
  { id: 'loc-ps-catering', name: 'PS Catering', location: 'PS CATERING', area: 'PS', kind: 'kitchen' },
  { id: 'loc-ps-catering-lngpp-project', name: 'PS Catering LNGPP Project', location: 'PS CATERING LNGPP PROJECT', area: 'PS', kind: 'kitchen' },
  { id: 'loc-ps-gcs', name: 'PS GCS', location: 'PS GCS', area: 'PS', kind: 'cleaning' },
  { id: 'loc-ps-laundry', name: 'PS Laundry', location: 'PS LAUNDRY', area: 'PS', kind: 'laundry' },
  { id: 'loc-support-service-officer-hl', name: 'Support Service Officer HL', location: 'SUPPORT SERVICE OFFICER HL', area: 'HL', kind: 'office' },
  { id: 'loc-support-service-officer-ll', name: 'Support Service Officer LL', location: 'SUPPORT SERVICE OFFICER LL', area: 'LL', kind: 'office' },
  { id: 'site-townsite', name: 'Townsite Office', location: 'TOWNSITE OFFICE', area: 'TOWNSITE', kind: 'office' },
  { id: 'site-1', name: 'Main Site', location: '', area: 'OTHER', kind: 'other' },
  { id: 'site-spcs', name: 'SPCS', location: '', area: 'OTHER', kind: 'other' },
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
export const INITIAL_FIELD_REPORTS: FieldReport[] = [];
export const INITIAL_CORRECTIVE_ACTIONS: CorrectiveAction[] = [];
