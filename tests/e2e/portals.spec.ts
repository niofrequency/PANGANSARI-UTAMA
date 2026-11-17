import { test, expect } from '@playwright/test';
import { U, seed, failOnPageErrors, pendingLog } from './helpers';

const people = {
  technician: U('tech', 'Tono', 'Teknisi', 'FOOD_SAFETY_TECHNICIAN'),
  housekeeper: U('hk', 'Hani', 'HK', 'HOUSEKEEPER'),
  supervisor: U('sup', 'Fajar', 'Pengawas', 'FOOD_SAFETY_SUPERVISOR'),
  manager: U('mgr', 'Fina', 'Manajer', 'FOOD_SAFETY_MANAGER'),
  gm: U('gm', 'Gita', 'GM', 'GENERAL_MANAGER', 'site-townsite', { assignedSites: 'ALL' }),
  admin: U('adm', 'Ada', 'Admin', 'ADMIN', 'site-townsite', { assignedSites: 'ALL' }),
};
const users = Object.values(people);

for (const [role, who] of Object.entries(people)) {
  test(`${role} portal opens without errors`, async ({ page }) => {
    const noErrors = failOnPageErrors(page);
    await seed(page, { users, submissions: [pendingLog('p1')], as: who });
    await expect(page.locator('main')).not.toBeEmpty();
    noErrors();
  });
}

test('supervisor gets a red badge for a log to check, and the dashboard counts it', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await seed(page, { users, submissions: [pendingLog('p2')], as: people.supervisor });
  await expect(page.locator('nav span.bg-psu-rejected').first()).toHaveText('1');
  await page.locator('nav button[title="Dashboard"]').first().click();
  await expect(page.getByText(/awaiting your sign-off/)).toBeVisible();
  noErrors();
});

test('a manager covering several locations can filter Ops Logs by location', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const atTown = pendingLog('t1', { userName: 'Tono Town', siteId: 'site-townsite', siteName: 'Townsite' });
  const atMelati = pendingLog('m1', { userName: 'Tono Melati', siteId: 'site-melatimess', siteName: '68 Melati Mess Hall' });
  for (const l of [atTown, atMelati]) (l.meta as { signoff: Record<string, unknown> }).signoff.checkedBy = { userId: 'sup', name: 'Fajar', at: new Date().toISOString() };
  await seed(page, { users, submissions: [atTown, atMelati], as: people.manager });
  const rail = page.locator('nav button[title="Ops Logs"]');
  await rail.first().click();
  await expect(page.locator('text=Tono Town >> visible=true').first()).toBeVisible();
  await expect(page.locator('text=Tono Melati >> visible=true').first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Location' }).selectOption({ label: '68 Melati Mess Hall' });
  await expect(page.locator('text=Tono Town >> visible=true')).toHaveCount(0);
  await expect(page.locator('text=Tono Melati >> visible=true').first()).toBeVisible();
  noErrors();
});
