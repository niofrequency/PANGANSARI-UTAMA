import { Site, UserRole } from '../types';
import { Sheet } from './spreadsheetReader';

// Turns PSU's HR employee list (NO / NO. ID / NAMA / LOKASI KERJA /
// JABATAN) into app accounts: Staff ID = NO. ID, site = the matching work
// location (SITES' `location`), role worked out from the job title and the
// kind of location. Everything here is pure, so the Admin sees a full
// preview before anything is created.

export interface EmployeeRow {
  staffId: string;
  name: string;
  locationText: string;
  title: string;
}

export type SkipReason = 'no-id' | 'bad-id' | 'duplicate-id' | 'unknown-location' | 'no-role' | 'exists';

export interface PlannedRow extends EmployeeRow {
  siteId?: string;
  role?: UserRole;
  skip?: SkipReason;
}

const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Finds the employee table: the sheet with a header row holding ID, name,
// location and job title columns (Indonesian or English headings). Prefers
// a sheet called "ALL EMPLOYEE", else the one with the most rows.
export function extractEmployees(sheets: Sheet[]): EmployeeRow[] | null {
  const candidates = [...sheets].sort((a, b) =>
    (norm(b.name) === 'ALL EMPLOYEE' ? 1 : 0) - (norm(a.name) === 'ALL EMPLOYEE' ? 1 : 0) || b.rows.length - a.rows.length);
  for (const sheet of candidates) {
    for (let h = 0; h < Math.min(15, sheet.rows.length); h++) {
      const head = (sheet.rows[h] || []).map(c => norm(c || ''));
      const find = (...keys: string[]) => head.findIndex(c => keys.some(k => c === k || c.startsWith(k)));
      const id = find('NO. ID', 'NO ID', 'ID', 'STAFF ID', 'EMPLOYEE ID');
      const name = find('NAMA', 'NAME');
      const loc = find('LOKASI KERJA', 'LOKASI', 'LOCATION', 'WORK LOCATION');
      const title = find('JABATAN', 'POSITION', 'JOB TITLE', 'TITLE');
      if (id < 0 || name < 0 || loc < 0 || title < 0) continue;
      const out: EmployeeRow[] = [];
      for (const r of sheet.rows.slice(h + 1)) {
        if (!r || !(r[name] || '').trim()) continue;
        out.push({
          staffId: String(r[id] || '').replace(/\.0$/, '').trim().toUpperCase(),
          name: (r[name] || '').trim(),
          locationText: (r[loc] || '').trim(),
          title: (r[title] || '').trim(),
        });
      }
      return out;
    }
  }
  return null;
}

export function matchSite(locationText: string, sites: Site[]): Site | undefined {
  const n = norm(locationText);
  return sites.find(s => s.location && norm(s.location) === n) || sites.find(s => norm(s.name) === n);
}

type Dept = 'HK' | 'FS' | null;

// Housekeeping vs Food Safety side of the business for a location.
function deptOf(site: Site): Dept {
  switch (site.kind) {
    case 'kitchen': case 'hotel': case 'warehouse': return 'FS';
    case 'camp': case 'laundry': case 'cleaning': case 'sport': case 'library': case 'maintenance': return 'HK';
    case 'office':
      // QSHE sits in Townsite Office; the Support Service Officer offices
      // belong to camp/general services.
      return site.id === 'site-townsite' ? 'FS' : 'HK';
    default: return null;
  }
}

// Job title (+ location) → app role. Returns undefined for jobs no app
// role covers yet (drivers, clerks, electricians, sport attendants…) —
// those are skipped and listed so the Admin can add them by hand.
export function roleFor(rawTitle: string, site: Site): UserRole | undefined {
  const t = norm(rawTitle).replace(/\s+(I{1,3}|IV|V)$/, '');
  const dept = deptOf(site);

  // Site-wide leadership.
  if (/^(GENERAL MANAGER|DEPUTY GENERAL MANAGER)$/.test(t) || /^DIRECTOR\b/.test(t) || /^HEAD OF\b/.test(t)) return 'GENERAL_MANAGER';
  if (/^MANAGER (HR|IR|COC|PHD)\b/.test(t)) return 'GENERAL_MANAGER';
  if (/^MANAGER (QHSE|QSHE)\b/.test(t)) return 'FOOD_SAFETY_MANAGER';

  // Managers and assistant managers.
  if (/MANAGER\b/.test(t) || /^EXECUTIVE CHEF$/.test(t)) {
    if (dept === 'FS') return 'FOOD_SAFETY_MANAGER';
    if (dept === 'HK') return 'HOUSEKEEPING_MANAGER';
    return undefined;
  }

  // Leadhands (L/H, Sr. L/H).
  if (/^(SR\. )?L\/H\b/.test(t)) {
    if (dept === 'FS') return 'FOOD_SAFETY_LEADHAND';
    if (dept === 'HK') return 'HOUSEKEEPING_LEADHAND';
    return undefined;
  }

  // Supervisors and kitchen section heads.
  if (/SUPERVISOR\b/.test(t) || /^(CHEF DE PARTIE|SOUS CHEF|SHIFT LEADER)$/.test(t)) {
    if (dept === 'FS') return 'FOOD_SAFETY_SUPERVISOR';
    if (dept === 'HK') return 'HOUSEKEEPING_SUPERVISOR';
    return undefined;
  }

  // Frontline staff.
  if (/LAUNDRY/.test(t)) return 'HOUSEKEEPING_LAUNDRY';
  if (/^(JANITOR|CLEANER)\b/.test(t)) return 'HOUSEKEEPING_JANITOR';
  if (/^CAMP ATTENDANT\b/.test(t)) return 'HOUSEKEEPER';
  if (/^(MESS ATTENDANT|COOK|ASST\. COOK|COOK HELPER|BAKER|ASST\. BAKER|BAKER HELPER|STEWARD|DISHWASHER|BUTCHER|WAITER|WAITRESS|WAITRES|BARTENDER|BARISTA|CASHIER|SUSHI CHEF|DEMI CHEF DE PARTIE)\b/.test(t)) return 'FOOD_SAFETY_TECHNICIAN';
  if (/^STOREMAN\b/.test(t) && dept === 'FS') return 'FOOD_SAFETY_TECHNICIAN';
  if (/^GENERAL PURPOSE ATTENDANT\b/.test(t)) {
    if (site.kind === 'kitchen' || site.kind === 'hotel') return 'FOOD_SAFETY_TECHNICIAN';
    if (site.kind === 'camp') return 'HOUSEKEEPER';
    if (site.kind === 'laundry') return 'HOUSEKEEPING_LAUNDRY';
    if (site.kind === 'cleaning') return 'HOUSEKEEPING_JANITOR';
  }
  return undefined;
}

// Full plan for every row: which site and role, or why it's skipped.
// `existingStaffCodes` = Staff IDs already used in the app (re-running an
// import never creates duplicates).
export function planImport(rows: EmployeeRow[], sites: Site[], existingStaffCodes: Set<string>): PlannedRow[] {
  const seen = new Set<string>();
  return rows.map(r => {
    if (!r.staffId) return { ...r, skip: 'no-id' as const };
    if (!/^[A-Z0-9]{3,12}$/.test(r.staffId)) return { ...r, skip: 'bad-id' as const };
    if (seen.has(r.staffId)) return { ...r, skip: 'duplicate-id' as const };
    seen.add(r.staffId);
    if (existingStaffCodes.has(r.staffId)) return { ...r, skip: 'exists' as const };
    const site = matchSite(r.locationText, sites);
    if (!site) return { ...r, skip: 'unknown-location' as const };
    const role = roleFor(r.title, site);
    if (!role) return { ...r, siteId: site.id, skip: 'no-role' as const };
    return { ...r, siteId: site.id, role };
  });
}

// Credentials sheet for the Admin to hand out — CSV that opens in Excel.
export function credentialsCsv(rows: { staffId: string; name: string; siteName: string; roleLabel: string; password: string }[]): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [['Staff ID', 'Name', 'Location', 'Role', 'Password'].join(',')];
  for (const r of rows) lines.push([r.staffId, r.name, r.siteName, r.roleLabel, r.password].map(esc).join(','));
  return '﻿' + lines.join('\r\n');
}
