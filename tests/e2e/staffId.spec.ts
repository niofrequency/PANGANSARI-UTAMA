import { test, expect } from '@playwright/test';

// Desktop: the Staff ID field accepts typing and pasting, letters and
// numbers, cleaned to A–Z / 0–9 upper-case.
test('staff ID can be pasted with letters on desktop', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop behaviour');
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Staff ID/ }).first().click();
  const field = page.getByRole('textbox', { name: /Staff ID/i });
  await field.click();
  // A real clipboard paste (Ctrl+V), the way someone copies their ID.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText(' tech-01 '));
  await page.keyboard.press('ControlOrMeta+V');
  await expect(field).toHaveValue('TECH01');
  await field.pressSequentially('ab9');
  await expect(field).toHaveValue('TECH01AB9');
});
