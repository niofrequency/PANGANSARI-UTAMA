import { describe, expect, it } from 'vitest';
import { sitesForScope, userCanSeeSite } from '../../src/lib/siteScope';
import { user } from './fixtures';

describe('site scope', () => {
  it('department managers cover every site by default (their home is often an office)', () => {
    const mgr = user('m', 'FOOD_SAFETY_MANAGER', 'site-office');
    expect(sitesForScope(mgr)).toBe('ALL');
    expect(userCanSeeSite(mgr, 'site-melati')).toBe(true);
  });
  it('admin can still narrow a manager to chosen sites', () => {
    const mgr = user('m', 'HOUSEKEEPING_MANAGER', 'site-office', { assignedSites: ['site-office'] });
    expect(userCanSeeSite(mgr, 'site-melati')).toBe(false);
  });
  it('supervisors stay on their home site unless widened', () => {
    const sup = user('s', 'FOOD_SAFETY_SUPERVISOR', 'site-melati');
    expect(sitesForScope(sup)).toEqual(['site-melati']);
  });
});
