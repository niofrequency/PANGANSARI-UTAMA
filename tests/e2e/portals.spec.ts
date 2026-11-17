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
  await expect(page.getByText(/waiting for your stamp/)).toBeVisible();
  noErrors();
});
