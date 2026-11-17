import { where, type QueryConstraint } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { sitesForScope } from './siteScope';
import { chunk } from '../services/liveQuery';
import { localDateISO } from '../utils/localDate';

// What each person loads from Firestore, by role — sized for ~1,000 daily
// users (see docs PRD §9 "Scale"). Three audiences:
//   • frontline (Housekeeper, Laundry, Janitor, FS Technician): their own
//     records, plus this month's SHARED sheets at their sites (Temperature
//     Control / Dishwashing / Mess Hall month grids, Restroom & Laundry
//     slots), and the people they can chat with.
//   • reviewer (Leadhand / Supervisor): their sites, a 14-day window, plus
//     everything still open (pending / sent back) at any age.
//   • office (Manager / GM / Admin): same as reviewer; with access to
//     every site the window is 3 days (open items at any age still load).
// Older history is paged in on demand (LoadOlderHistory / dashboard).
export type Audience = 'frontline' | 'reviewer' | 'office';

const FRONTLINE: UserRole[] = ['HOUSEKEEPER', 'HOUSEKEEPING_LAUNDRY', 'HOUSEKEEPING_JANITOR', 'FOOD_SAFETY_TECHNICIAN'];
export const SHARED_SHEET_TYPES = ['TEMP_CONTROL', 'DISHWASH_TEMP', 'MESS_HALL_HYGIENE', 'RESTROOM', 'LAUNDRY_SHOP'];

export function audienceOf(role?: UserRole): Audience {
  if (!role || FRONTLINE.includes(role)) return 'frontline';
  if (/_LEADHAND$|_SUPERVISOR$/.test(role)) return 'reviewer';
  return 'office';
}

export function liveWindowDaysFor(user: User): number {
  const a = audienceOf(user.role);
  if (a === 'frontline') return 31;
  return sitesForScope(user) === 'ALL' ? 3 : 14;
}

function startOfMonthISO(): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

// ── submissions ──────────────────────────────────────────────────────
export function submissionSlices(user: User, sinceISO: string): QueryConstraint[][] {
  const own = [
    [where('userId', '==', user.id), where('timestamp', '>=', sinceISO)],
    [where('userId', '==', user.id), where('status', '==', 'REJECTED')],
  ];
  const scope = sitesForScope(user);
  if (audienceOf(user.role) === 'frontline') {
    const sites = scope === 'ALL' ? [] : Array.from(new Set(scope.filter(Boolean)));
    // site × type `in` product must stay ≤ 30 → ≤ 6 sites per slice.
    const shared = chunk(sites, Math.floor(30 / SHARED_SHEET_TYPES.length)).map((c) => [
      where('siteId', 'in', c), where('type', 'in', SHARED_SHEET_TYPES), where('timestamp', '>=', startOfMonthISO()),
    ]);
    return [...own, ...shared];
  }
  if (scope === 'ALL') {
    return [
      ...own,
      [where('timestamp', '>=', sinceISO)],
      [where('status', 'in', ['PENDING', 'REJECTED'])],
    ];
  }
  const sites = Array.from(new Set(scope.filter(Boolean)));
  return [
    ...own,
    ...chunk(sites, 30).map((c) => [where('siteId', 'in', c), where('timestamp', '>=', sinceISO)]),
    ...chunk(sites, 15).map((c) => [where('siteId', 'in', c), where('status', 'in', ['PENDING', 'REJECTED'])]),
  ];
}

// ── users (chat contacts, names, personnel) ─────────────────────────
function deptOf(role: UserRole): 'HOUSEKEEPING' | 'FOOD_SAFETY' | null {
  if (role.startsWith('HOUSEKEEPING') || role === 'HOUSEKEEPER') return 'HOUSEKEEPING';
  if (role.startsWith('FOOD_SAFETY')) return 'FOOD_SAFETY';
  return null;
}

export function userSlices(user: User): QueryConstraint[][] {
  const a = audienceOf(user.role);
  if (a === 'office') return [[]]; // Personnel / Users tabs need everyone.
  const d = deptOf(user.role);
  if (!d) return [[]];
  if (a === 'frontline') {
    // Chat: frontline ↔ their Leadhand / Supervisor, and Admin.
    return [[where('role', 'in', [`${d}_LEADHAND`, `${d}_SUPERVISOR`, 'ADMIN'])]];
  }
  const staff: string[] = d === 'HOUSEKEEPING'
    ? ['HOUSEKEEPER', 'HOUSEKEEPING_LAUNDRY', 'HOUSEKEEPING_JANITOR', 'HOUSEKEEPING_LEADHAND', 'HOUSEKEEPING_SUPERVISOR', 'HOUSEKEEPING_MANAGER']
    : ['FOOD_SAFETY_TECHNICIAN', 'FOOD_SAFETY_LEADHAND', 'FOOD_SAFETY_SUPERVISOR', 'FOOD_SAFETY_MANAGER'];
  return [[where('role', 'in', [...staff, 'GENERAL_MANAGER', 'ADMIN'])]];
}

// ── warnings / reported issues / action items ───────────────────────
const daysAgoISO = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export function warningSlices(user: User): QueryConstraint[][] {
  if (audienceOf(user.role) === 'frontline') return [[where('technicianId', '==', user.id)]];
  return [[where('timestamp', '>=', daysAgoISO(90))]];
}

export function fieldReportSlices(user: User): QueryConstraint[][] {
  if (audienceOf(user.role) === 'frontline') return [[where('userId', '==', user.id)]];
  return [
    [where('status', 'in', ['OPEN', 'ACKNOWLEDGED'])],
    [where('timestamp', '>=', daysAgoISO(60))],
  ];
}

export function actionSlices(user: User): QueryConstraint[][] {
  if (audienceOf(user.role) === 'frontline') return [[where('assignedToId', '==', user.id)]];
  return [
    [where('status', 'in', ['OPEN', 'DONE'])],
    [where('createdAt', '>=', daysAgoISO(60))],
  ];
}

// Missed checks: reviewers and office only (frontline never sees them).
export function wantsMissedChecks(user: User): boolean {
  return audienceOf(user.role) !== 'frontline';
}

export const todayISO = () => localDateISO(new Date());
