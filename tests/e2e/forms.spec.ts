import { test, expect } from '@playwright/test';
import { U, seed, failOnPageErrors } from './helpers';

// Every "fill a checklist" form opens without crashing, for every role
// that fills one. (A hook after an early return once broke all of them
// for Supervisors — React error #300.)
const FS_SUPERVISOR_FORMS = ['Temperature Control', 'Dishwashing', 'Mess Hall', 'Cooking', 'Hot Packed', 'Thawing', 'Staff Ready'];

for (const [role, forms] of [
  ['FOOD_SAFETY_SUPERVISOR', FS_SUPERVISOR_FORMS],
  ['FOOD_SAFETY_LEADHAND', FS_SUPERVISOR_FORMS],
] as const) {
  for (const form of forms) {
    test(`${role} can open ${form}`, async ({ page }) => {
      const noErrors = failOnPageErrors(page);
      const me = U('me', 'Fajar', 'Pengawas', role, 'site-melatimess');
      await seed(page, { users: [me], as: me });
      await page.locator(`button:has-text("${form}") >> visible=true`).first().click();
      await page.waitForTimeout(600);
      await expect(page.getByText('Something went wrong')).toHaveCount(0);
      noErrors();
    });
  }
}

test('technician can open Temperature Control and Dishwashing', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const me = U('t', 'Tono', 'Teknisi', 'FOOD_SAFETY_TECHNICIAN', 'site-melatimess');
  await seed(page, { users: [me], as: me });
  for (const form of ['Temperature Control', 'Dishwashing']) {
    await page.locator(`button:has-text("${form}") >> visible=true`).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(800);
  }
  noErrors();
});

for (const role of ['HOUSEKEEPER', 'HOUSEKEEPING_JANITOR', 'HOUSEKEEPING_LAUNDRY'] as const) {
  test(`${role} checklist screen opens`, async ({ page }) => {
    const noErrors = failOnPageErrors(page);
    const me = U('x', 'Hani', 'HK', role, 'site-townsite');
    await seed(page, { users: [me], as: me });
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    noErrors();
  });
}
