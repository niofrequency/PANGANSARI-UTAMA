// Which sites a user can act on. Admin-configurable per user via
// `User.assignedSites` — "Home Site only" (the default, unset), a
// specific set of sites, or "All Sites" (see AdminPortal.tsx's
// SiteAccessPicker). What "act on" means depends on the role:
//
// - Supervisor/Manager/GM: their portal's review scope — Field Queue,
//   Escalations, Dashboard, Ops Logs (see those components).
// - Frontline roles (Housekeeper, Technician, Laundry Staff, Janitor):
//   which sites they may submit for and scan a job QR at, resolved to
//   one concrete working site per screen by hooks/useWorkingSite.ts.
//   A single-site account (the default) still sees no picker anywhere —
//   this only shows up once an Admin actually widens someone's access.

import { User, UserRole } from '../types';

// GENERAL_MANAGER and ADMIN already behaved as "sees every site" before
// assignedSites existed (GM's Escalations/Dashboard were hardcoded
// unscoped; Admin's Personnel/Activity/Analytics tabs default to every
// site). Keeping that as the fallback means neither account's behavior
// changes just because this field shipped.
const ALWAYS_UNSCOPED_ROLES: UserRole[] = ['GENERAL_MANAGER', 'ADMIN'];

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
