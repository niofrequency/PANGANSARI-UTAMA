import { Page, expect } from '@playwright/test';

// Demo mode keeps everything in localStorage — seed people and records,
// sign in as one of them, reload.
export type Seed = { users: unknown[]; submissions?: unknown[]; fieldReports?: unknown[]; actions?: unknown[]; as: unknown };

export const U = (id: string, first: string, last: string, role: string, site = 'site-townsite', extra: Record<string, unknown> = {}) => ({
  id, name: `${first} ${last}`.trim(), firstName: first, lastName: last, email: `${id}@psu.test`, role, site, isActive: true, ...extra,
});

export async function seed(page: Page, s: Seed) {
  await page.goto('/');
  await page.evaluate((s: Seed) => {
    localStorage.clear();
    localStorage.setItem('psu_users_v4', JSON.stringify(s.users));
    localStorage.setItem('psu_submissions_v4', JSON.stringify(s.submissions || []));
    localStorage.setItem('psu_field_reports_v1', JSON.stringify(s.fieldReports || []));
    localStorage.setItem('psu_corrective_actions_v1', JSON.stringify(s.actions || []));
    localStorage.setItem('psu_current_user_v4', JSON.stringify(s.as));
  }, s);
  await signInAs(page, s.as);
}

export async function signInAs(page: Page, u: unknown) {
  await page.evaluate((u: unknown) => localStorage.setItem('psu_current_user_v4', JSON.stringify(u)), u);
  await page.reload();
  // Portals are code-split — wait until one has rendered.
  await expect(page.locator('main')).toBeVisible();
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[class*=fixed]').forEach((e) => { if (/install/i.test(e.textContent || '')) e.remove(); }));
}

// Fail the test on any uncaught error in the page.
export function failOnPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return () => expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
}

export async function openOpsLogs(page: Page) {
  const rail = page.locator('nav button[title="Ops Logs"]');
  if (await rail.count()) await rail.first().click();
  await page.waitForTimeout(500);
}

export const now = () => new Date().toISOString();

export const pendingLog = (id: string, extra: Record<string, unknown> = {}) => ({
  id, userId: 'tech', userName: 'Tono Teknisi', role: 'FOOD_SAFETY_TECHNICIAN', siteId: 'site-townsite', siteName: 'Townsite',
  timestamp: now(), type: 'COOKING_SERVICE', status: 'PENDING',
  items: [{ id: 'lunch.soups', question: 'Lunch — Soups', answer: '82°C' }],
  meta: { mealPeriods: ['lunch'], cookingRows: {}, signoff: { draftedBy: { userId: 'tech', name: 'Tono Teknisi', at: now() } } },
  ...extra,
});

export async function stored(page: Page, id: string) {
  return page.evaluate((id) => JSON.parse(localStorage.getItem('psu_submissions_v4') || '[]').find((s: { id: string }) => s.id === id), id);
}
