import { test, expect } from '@playwright/test';

// Staff ID login: easy to find, and on a computer the ID can be pasted
// (letters and numbers) — into the box, anywhere on the screen, or with
// the Paste button.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('the login screen leads with a big "Log in with Staff ID" button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Log in with Staff ID/ })).toBeVisible();
});

test('desktop: paste into the box, anywhere on the screen, or with the Paste button', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop behaviour');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: /Log in with Staff ID/ }).click();
  const field = page.getByRole('textbox', { name: /Staff ID/i });

  // 1. The box is focused on open — Ctrl+V straight away.
  await expect(field).toBeFocused();
  await page.evaluate(() => navigator.clipboard.writeText(' tech-01 '));
  await page.keyboard.press('ControlOrMeta+V');
  await expect(field).toHaveValue('TECH01');

  // 2. After clicking a keypad key (focus leaves the box), Ctrl+V still works.
  await page.getByRole('button', { name: '7', exact: true }).click();
  await page.evaluate(() => navigator.clipboard.writeText('pt-4455a'));
  await page.keyboard.press('ControlOrMeta+V');
  await expect(field).toHaveValue('PT4455A');

  // 3. The Paste button.
  await page.evaluate(() => navigator.clipboard.writeText('hk 2026'));
  await page.getByRole('button', { name: /Paste ID/ }).click();
  await expect(field).toHaveValue('HK2026');

  // Typing letters works too.
  await field.fill('');
  await field.pressSequentially('ab9');
  await expect(field).toHaveValue('AB9');
});
