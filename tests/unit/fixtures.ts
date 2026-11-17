import { Submission, User, UserRole } from '../../src/types';

export const user = (id: string, role: UserRole, site = 'site-a', extra: Partial<User> = {}): User => ({
  id, name: id, firstName: id, lastName: '', email: `${id}@t.test`, role, site, isActive: true, ...extra,
});

let n = 0;
export const log = (over: Partial<Submission> & { signoff?: Record<string, unknown> } = {}): Submission => {
  const { signoff, ...rest } = over;
  return {
    id: `s${++n}`, userId: 'tech', userName: 'Tech', role: 'FOOD_SAFETY_TECHNICIAN', siteId: 'site-a', siteName: 'A',
    timestamp: new Date().toISOString(), type: 'FOOD_SAFETY', status: 'PENDING', items: [],
    meta: { signoff: { draftedBy: { userId: 'tech', name: 'Tech', at: new Date().toISOString() }, ...(signoff || {}) } },
    ...rest,
  } as Submission;
};
