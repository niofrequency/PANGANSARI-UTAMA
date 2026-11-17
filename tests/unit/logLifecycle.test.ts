import { describe, expect, it } from 'vitest';
import { stampProblem, reviewQueueFor, logTimeline, nextStepOf, reviewTierOf } from '../../src/lib/logLifecycle';
import { log, user } from './fixtures';

const at = new Date().toISOString();
const stamp = (userId: string) => ({ userId, name: userId, at });

describe('stampProblem — who may stamp which step', () => {
  it('lets the next reviewer stamp the next step', () => {
    expect(stampProblem(log(), 'sup', 'checkedBy')).toBeNull();
  });
  it('never your own log', () => {
    expect(stampProblem(log(), 'tech', 'checkedBy')).toBe('own-log');
  });
  it('only pending logs', () => {
    expect(stampProblem(log({ status: 'APPROVED' }), 'sup', 'checkedBy')).toBe('not-pending');
  });
  it('each step once — a second reviewer is told it is already stamped', () => {
    expect(stampProblem(log({ signoff: { checkedBy: stamp('sup') } }), 'sup2', 'checkedBy')).toBe('already-stamped');
  });
  it('in chain order', () => {
    expect(stampProblem(log(), 'mgr', 'approvedBy')).toBe('out-of-order');
  });
  it('separation of duties within a level (approve + verify)', () => {
    const mh = log({ type: 'MESS_HALL_HYGIENE', signoff: { checkedBy: stamp('sup'), approvedBy: stamp('mgr') } });
    expect(stampProblem(mh, 'mgr', 'verifiedBy')).toBe('stamped-other-step');
    expect(stampProblem(mh, 'mgr2', 'verifiedBy')).toBeNull();
  });
  it('but checking as supervisor then approving as manager is allowed', () => {
    expect(stampProblem(log({ signoff: { checkedBy: stamp('tes') } }), 'tes', 'approvedBy')).toBeNull();
  });
});

describe('reviewQueueFor — what reaches whom', () => {
  const tech = log();
  const checked = log({ signoff: { checkedBy: stamp('sup') } });
  const otherSite = log({ siteId: 'site-b' });
  const hk = log({ type: 'HOUSEKEEPING', role: 'HOUSEKEEPER', userId: 'hk' });
  const all = [tech, checked, otherSite, hk];

  it('supervisor gets "Checked by" logs at their sites, own department', () => {
    const q = reviewQueueFor(user('sup2', 'FOOD_SAFETY_SUPERVISOR'), all);
    expect(q.mine.map(s => s.id)).toEqual([tech.id]);
  });
  it('manager gets logs the supervisor has checked', () => {
    const q = reviewQueueFor(user('mgr', 'FOOD_SAFETY_MANAGER'), all);
    expect(q.mine.map(s => s.id)).toEqual([checked.id]);
  });
  it('GM covers both departments', () => {
    const q = reviewQueueFor(user('gm', 'GENERAL_MANAGER', 'site-a', { assignedSites: 'ALL' }), [checked, log({ type: 'HOUSEKEEPING', role: 'HOUSEKEEPER', signoff: { checkedBy: stamp('hs') } })]);
    expect(q.mine).toHaveLength(2);
  });
  it('own logs are listed as waiting for another reviewer, not dropped', () => {
    const own = log({ userId: 'sup', role: 'FOOD_SAFETY_SUPERVISOR' });
    const q = reviewQueueFor(user('sup', 'FOOD_SAFETY_SUPERVISOR'), [own]);
    expect(q.mine).toHaveLength(0);
    expect(q.others[0].reason).toBe('own-log');
  });
  it('frontline has no review queue', () => {
    expect(reviewQueueFor(user('t', 'FOOD_SAFETY_TECHNICIAN'), all).mine).toHaveLength(0);
    expect(reviewTierOf('FOOD_SAFETY_TECHNICIAN')).toBeNull();
  });
});

describe('logTimeline', () => {
  it('rebuilds a history for older logs from their stamps', () => {
    const later = new Date(Date.now() + 60_000).toISOString();
    const t = logTimeline(log({ signoff: { checkedBy: { userId: 'sup', name: 'sup', at: later } } }));
    expect(t.map(e => e.action)).toEqual(['submitted', 'stamped']);
  });
  it('nextStepOf follows the chain', () => {
    expect(nextStepOf(log())).toBe('checkedBy');
    expect(nextStepOf(log({ signoff: { checkedBy: stamp('sup') } }))).toBe('approvedBy');
  });
});
