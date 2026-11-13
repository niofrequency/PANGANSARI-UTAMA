import { User, UserRole } from '../types';
import { userCanSeeSite } from './siteScope';

// Who can chat with whom (mirrored server-side in firestore.rules'
// canChat()):
//   Manager    <-> Supervisor, Manager
//   Supervisor <-> Manager, Supervisor, Frontline staff
//   Frontline  <-> Supervisor only
// Department-scoped (Housekeeping with Housekeeping, Food Safety with Food
// Safety) except the General Manager, who spans both. Site access narrows
// the contact list on top of that (client-side only).
export type ChatTier = 'manager' | 'supervisor' | 'frontline';

const TIER: Partial<Record<UserRole, ChatTier>> = {
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
  if (role === 'GENERAL_MANAGER') return 'ALL';
  if (role === 'HOUSEKEEPER' || role.startsWith('HOUSEKEEPING')) return 'HOUSEKEEPING';
  if (role.startsWith('FOOD_SAFETY')) return 'FOOD_SAFETY';
  return null;
}

export function canChatRoles(a: UserRole, b: UserRole): boolean {
  const ta = chatTier(a), tb = chatTier(b);
  if (!ta || !tb) return false;
  const pair = [ta, tb].sort().join('-');
  const allowedPair = ['manager-manager', 'manager-supervisor', 'supervisor-supervisor', 'frontline-supervisor'].includes(pair);
  if (!allowedPair) return false;
  if (pair === 'manager-manager') return true;
  const da = department(a), db = department(b);
  return da === 'ALL' || db === 'ALL' || da === db;
}

// Contact list for `me`: roles allowed above, plus the higher-ranked side
// of the pair must have the other person's home site in its scope.
export function chatContacts(me: User, users: User[]): User[] {
  const rank: Record<ChatTier, number> = { frontline: 0, supervisor: 1, manager: 2 };
  return users.filter(u => {
    if (u.id === me.id || !u.isActive || !canChatRoles(me.role, u.role)) return false;
    const a = chatTier(me.role)!, b = chatTier(u.role)!;
    if (rank[a] > rank[b]) return userCanSeeSite(me, u.site);
    if (rank[b] > rank[a]) return userCanSeeSite(u, me.site);
    return true;
  });
}

export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('__');
}
