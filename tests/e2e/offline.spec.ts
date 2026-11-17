import { test, expect } from '@playwright/test';
import { U, seed } from './helpers';

// Field staff often have no data. After the app has been opened online
// once, it must open and every form must load with NO connection (the
// service worker caches every file of the app, not just screens already
// visited).
test('after one online visit, the app and never-opened forms work offline', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'service-worker test runs once');
  test.setTimeout(90_000);
  const tech = U('t', 'Tono', 'Teknisi', 'FOOD_SAFETY_TECHNICIAN', 'site-melatimess');
  await seed(page, { users: [tech], as: tech });
  // Wait until the service worker controls the page and has cached the app.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(async () => page.evaluate(async () => {
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) n += (await (await caches.open(k)).keys()).length;
    return n;
  }), { timeout: 30_000 }).toBeGreaterThan(15);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  for (const form of ['Temperature Control', 'Dishwashing']) {
    await page.locator(`button:has-text("${form}") >> visible=true`).first().click();
    await page.waitForTimeout(800);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
  }
  await context.setOffline(false);
});
