import { User, UserRole } from '../types';
import { userCanSeeSite } from './siteScope';

// Who can chat with whom (mirrored server-side in firestore.rules'
// canChat()):
//   Admin      <-> everyone
//   Manager    <-> Supervisor, Manager
//   Supervisor <-> Manager, Supervisor, Frontline staff
//   Frontline  <-> Supervisor only
// Department-scoped (Housekeeping with Housekeeping, Food Safety with Food
// Safety) except the General Manager and Admin, who span both.
//
// Food Safety Technicians are narrowed further to their LOCATION
// supervisor: a Supervisor whose home site is one of the Technician's own
// sites (home site, plus any extra sites an admin assigned). Enforced in
// both directions and in firestore.rules, so a Technician never gets a
// message they can't answer and never sees supervisors from other sites.
export type ChatTier = 'admin' | 'manager' | 'supervisor' | 'frontline';

const TIER: Partial<Record<UserRole, ChatTier>> = {
  ADMIN: 'admin',
  HOUSEKEEPING_MANAGER: 'manager',
  FOOD_SAFETY_MANAGER: 'manager',
  GENERAL_MANAGER: 'manager',
  HOUSEKEEPING_SUPERVISOR: 'supervisor',
  FOOD_SAFETY_SUPERVISOR: 'supervisor',
  HOUSEKEEPER: 'frontline',
  HOUSEKEEPING_LAUNDRY: 'frontline',
  HOUSEKEEPING_JANITOR: 'frontline',
  FOOD_SAFETY_TECHNICIAN: 'frontline',
};

export function chatTier(role: UserRole): ChatTier | null {
  return TIER[role] ?? null;
}

function department(role: UserRole): 'HOUSEKEEPING' | 'FOOD_SAFETY' | 'ALL' | null {
  if (role === 'GENERAL_MANAGER' || role === 'ADMIN') return 'ALL';
  if (role === 'HOUSEKEEPER' || role.startsWith('HOUSEKEEPING')) return 'HOUSEKEEPING';
  if (role.startsWith('FOOD_SAFETY')) return 'FOOD_SAFETY';
  return null;
}

export function canChatRoles(a: UserRole, b: UserRole): boolean {
  const ta = chatTier(a), tb = chatTier(b);
  if (!ta || !tb) return false;
  if (ta === 'admin' || tb === 'admin') return true;
  const pair = [ta, tb].sort().join('-');
  const allowedPair = ['manager-manager', 'manager-supervisor', 'supervisor-supervisor', 'frontline-supervisor'].includes(pair);
  if (!allowedPair) return false;
  if (pair === 'manager-manager') return true;
  const da = department(a), db = department(b);
  return da === 'ALL' || db === 'ALL' || da === db;
}

// A Technician's own sites: home site plus any admin-assigned extras.
function technicianSites(tech: User): string[] {
  const extra = Array.isArray(tech.assignedSites) ? tech.assignedSites : [];
  return [tech.site, ...extra];
}

// Technician <-> Supervisor only at the Technician's location.
function technicianSiteOk(a: User, b: User): boolean {
  if (a.role === 'FOOD_SAFETY_TECHNICIAN' && chatTier(b.role) === 'supervisor') return technicianSites(a).includes(b.site);
  if (b.role === 'FOOD_SAFETY_TECHNICIAN' && chatTier(a.role) === 'supervisor') return technicianSites(b).includes(a.site);
  return true;
}

// Full check for a specific pair of people (roles + Technician location).
export function canChatUsers(a: User, b: User): boolean {
  return canChatRoles(a.role, b.role) && technicianSiteOk(a, b);
}

// Contact list for `me`. On top of canChatUsers, the higher-ranked side of
// the pair must have the other person's home site in its site access
// (Admins see everyone).
export function chatContacts(me: User, users: User[]): User[] {
  const rank: Record<ChatTier, number> = { frontline: 0, supervisor: 1, manager: 2, admin: 3 };
  return users.filter(u => {
    if (u.id === me.id || !u.isActive || !canChatUsers(me, u)) return false;
    const a = chatTier(me.role)!, b = chatTier(u.role)!;
    if (a === 'admin' || b === 'admin') return true;
    if (rank[a] > rank[b]) return userCanSeeSite(me, u.site);
    if (rank[b] > rank[a]) return userCanSeeSite(u, me.site);
    return true;
  });
}

export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('__');
}
