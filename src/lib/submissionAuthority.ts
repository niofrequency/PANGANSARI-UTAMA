import { Submission, User, UserRole } from '../types';
import { departmentOf } from '../data/opsLogsCatalog';
import { userCanSeeSite } from './siteScope';

// Chain of command for logs (mirrored in firestore.rules' roleRank()):
// a Supervisor or anyone above them can delete or send back ("return for
// correction") a log filed by someone ranked BELOW them, in their own
// department and within their site access. Admin and General Manager span
// both departments.
const RANK: Record<UserRole, number> = {
  HOUSEKEEPER: 1, HOUSEKEEPING_LAUNDRY: 1, HOUSEKEEPING_JANITOR: 1, FOOD_SAFETY_TECHNICIAN: 1,
  HOUSEKEEPING_LEADHAND: 2, FOOD_SAFETY_LEADHAND: 2,
  HOUSEKEEPING_SUPERVISOR: 3, FOOD_SAFETY_SUPERVISOR: 3,
  HOUSEKEEPING_MANAGER: 4, FOOD_SAFETY_MANAGER: 4,
  GENERAL_MANAGER: 5,
  ADMIN: 6,
};

export function roleRank(role: UserRole | undefined): number {
  return role ? RANK[role] ?? 0 : 0;
}

function roleDepartment(role: UserRole): 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'ALL' {
  if (role === 'ADMIN' || role === 'GENERAL_MANAGER') return 'ALL';
  return role === 'HOUSEKEEPER' || role.startsWith('HOUSEKEEPING') ? 'HOUSEKEEPING' : 'FOOD_SAFETY';
}

// Can `user` delete or return `s`? Supervisor rank or higher, strictly
// above whoever filed it, same department, site in their access.
export function canManageSubmission(user: User | null | undefined, s: Submission): boolean {
  if (!user || s.userId === user.id || s.deletedAt) return false;
  const mine = roleRank(user.role);
  if (mine < 3 || mine <= roleRank(s.role)) return false;
  const dept = roleDepartment(user.role);
  if (dept !== 'ALL' && departmentOf(s) && departmentOf(s) !== dept) return false;
  return user.role === 'ADMIN' || userCanSeeSite(user, s.siteId);
}
