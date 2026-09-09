// Which sites a user can see/act on in their portal's review scope
// (Supervisor Field Queue + Ops Logs, Manager Escalations/Dashboard/Ops
// Logs). Admin-configurable per user via `User.assignedSites` — "Home
// Site only" (the default, unset), a specific set of sites, or "All
// Sites". Frontline roles (Housekeeper, Technician, Laundry Staff,
// Janitor) never consult this: their portals always work at their
// single `User.site` (submission attribution, Scan-to-Job QR
// matching) regardless of what assignedSites is set to.

import { User, UserRole } from '../types';

// These two already behaved as "sees every site" before assignedSites
// existed (GENERAL_MANAGER's Escalations/Dashboard were hardcoded
// unscoped; ADMIN's Personnel/Activity/Analytics tabs default to every
// site). Keeping that as the fallback means no existing account's
// behavior changes just because this field shipped.
const ALWAYS_UNSCOPED_ROLES: UserRole[] = ['GENERAL_MANAGER', 'ADMIN'];

// Only these roles' portals actually read assignedSites today — the
// Admin Portal only shows the Site Access control for them, so nobody
// sees a setting that silently does nothing.
export const SITE_SCOPED_ROLES: UserRole[] = [
  'HOUSEKEEPING_SUPERVISOR',
  'HOUSEKEEPING_MANAGER',
  'FOOD_SAFETY_SUPERVISOR',
  'FOOD_SAFETY_MANAGER',
  'GENERAL_MANAGER',
];

export function sitesForScope(user: User): string[] | 'ALL' {
  // An empty array is treated the same as unset rather than "sees
  // nothing" — the Admin Portal's picker never produces one (it falls
  // back to Home Site the moment the last custom site is unchecked), but
  // nothing else should have to trust that invariant to stay safe.
  if (user.assignedSites && (user.assignedSites === 'ALL' || user.assignedSites.length > 0)) {
    return user.assignedSites;
  }
  if (ALWAYS_UNSCOPED_ROLES.includes(user.role)) return 'ALL';
  return [user.site];
}

export function userCanSeeSite(user: User | null | undefined, siteId: string | undefined | null): boolean {
  if (!user || !siteId) return false;
  const scope = sitesForScope(user);
  return scope === 'ALL' || scope.includes(siteId);
}
