import { describe, expect, it } from 'vitest';
import { audienceOf, liveWindowDaysFor, submissionSlices, userSlices } from '../../src/lib/dataScope';
import { user } from './fixtures';

const since = new Date().toISOString();

describe('dataScope — what each phone loads', () => {
  it('audiences', () => {
    expect(audienceOf('HOUSEKEEPER')).toBe('frontline');
    expect(audienceOf('FOOD_SAFETY_LEADHAND')).toBe('reviewer');
    expect(audienceOf('GENERAL_MANAGER')).toBe('office');
    expect(audienceOf('ADMIN')).toBe('office');
  });
  it('all-site access gets a short live window; one site gets two weeks', () => {
    expect(liveWindowDaysFor(user('a', 'ADMIN', 'site-a', { assignedSites: 'ALL' }))).toBe(3);
    expect(liveWindowDaysFor(user('s', 'FOOD_SAFETY_SUPERVISOR'))).toBe(14);
  });
  it('frontline never loads an unfiltered submissions query', () => {
    for (const slice of submissionSlices(user('t', 'FOOD_SAFETY_TECHNICIAN'), since)) expect(slice.length).toBeGreaterThan(0);
  });
  it('more than 30 sites are split into ≤30-site queries (never unfiltered)', () => {
    const sites = Array.from({ length: 45 }, (_, i) => `site-${i}`);
    const slices = submissionSlices(user('m', 'FOOD_SAFETY_MANAGER', 'site-0', { assignedSites: sites }), since);
    expect(slices.every(s => s.length > 0)).toBe(true);
    expect(slices.length).toBeGreaterThanOrEqual(2 + 2 + 3); // own ×2, recent ×2 chunks, open ×3 chunks
  });
  it('frontline only loads chat contacts, office loads everyone', () => {
    expect(userSlices(user('t', 'FOOD_SAFETY_TECHNICIAN'))[0].length).toBe(1);
    expect(userSlices(user('a', 'ADMIN'))).toEqual([[]]);
  });
});
