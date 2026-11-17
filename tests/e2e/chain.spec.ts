import { test, expect } from '@playwright/test';
import { U, seed, signInAs, failOnPageErrors, openOpsLogs, pendingLog, stored } from './helpers';

const tech = U('tech', 'Tono', 'Teknisi', 'FOOD_SAFETY_TECHNICIAN');
const sup = U('sup', 'Fajar', 'Pengawas', 'FOOD_SAFETY_SUPERVISOR');
const mgr = U('mgr', 'Fina', 'Manajer', 'FOOD_SAFETY_MANAGER');
const users = [tech, sup, mgr];

test('a log goes up the chain: supervisor checks, manager approves', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await seed(page, { users, submissions: [pendingLog('l1')], as: sup });
  await openOpsLogs(page);
  await page.locator('text=Tono Teknisi >> visible=true').first().click();
  await page.getByRole('button', { name: /Stamp — Checked/ }).click();
  await page.getByRole('button', { name: /Stamp without signature/ }).click();
  await expect(page.getByText(/Stamped — sent up/)).toBeVisible();
  expect(Object.keys((await stored(page, 'l1')).meta.signoff)).toContain('checkedBy');

  await signInAs(page, mgr);
  await openOpsLogs(page);
  await page.locator('text=Tono Teknisi >> visible=true').first().click();
  await page.getByRole('button', { name: /Stamp — Approved/ }).click();
  await page.getByRole('button', { name: /Stamp without signature/ }).click();
  await expect(page.getByText(/Approved — the log is complete/)).toBeVisible();
  const s = await stored(page, 'l1');
  expect(s.status).toBe('APPROVED');
  expect(s.meta.history.map((e: { action: string }) => e.action)).toEqual(['stamped', 'stamped']);
  noErrors();
});

test('manager sends a log back to the supervisor, who fixes and sends it up', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const checked = pendingLog('l2', {});
  (checked.meta as { signoff: Record<string, unknown> }).signoff.checkedBy = { userId: 'sup', name: 'Fajar Pengawas', role: 'FOOD_SAFETY_SUPERVISOR', at: new Date().toISOString() };
  await seed(page, { users, submissions: [checked], as: mgr });
  await openOpsLogs(page);
  await page.locator('text=Tono Teknisi >> visible=true').first().click();
  await page.getByRole('button', { name: /^Reject$/ }).first().click();
  await page.locator('textarea:visible').fill('Install temperature missing');
  await page.getByRole('button', { name: /Send back to Fajar/ }).click();
  expect((await stored(page, 'l2')).meta.returned.to).toBe('reviewer');

  await signInAs(page, sup);
  await page.getByRole('button', { name: /^Fix now$/ }).first().click();
  await page.getByRole('button', { name: /Fixed — send back up to Fina/ }).click();
  await page.locator('textarea:visible').fill('Checked, 80°C at 11:00');
  await page.getByRole('button', { name: /Next: stamp/ }).click();
  await page.getByRole('button', { name: /Stamp without signature/ }).click();
  const s = await stored(page, 'l2');
  expect(s.status).toBe('PENDING');
  expect(s.meta.returned.resolved.note).toContain('80°C');
  expect(Object.keys(s.meta.signoff)).toContain('checkedBy');
  noErrors();
});

test('a log sent back to the technician shows in their Rejected tab with the comment', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const rejected = pendingLog('l3', { status: 'REJECTED', rejectionReason: 'Re-check soup',
    type: 'FOOD_SAFETY' });
  (rejected.meta as Record<string, unknown>).returned = { userId: 'sup', name: 'Fajar Pengawas', role: 'FOOD_SAFETY_SUPERVISOR', at: new Date().toISOString(), note: 'Re-check soup', fromStatus: 'PENDING', to: 'filer' };
  await seed(page, { users, submissions: [rejected], as: tech });
  await expect(page.getByRole('button', { name: /^Fix now$/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Rejected/ }).first().click();
  await expect(page.getByText('“Re-check soup”').first()).toBeVisible();
  await expect(page.getByText(/Comment from Fajar Pengawas/).first()).toBeVisible();
  noErrors();
});

test('a manager based at the office approves a log from a work site; it becomes final and moves to History', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  const officeMgr = U('mgr2', 'Maya', 'Office', 'FOOD_SAFETY_MANAGER', 'site-townsite');
  const atMelati = pendingLog('l4', { siteId: 'site-melatimess', siteName: '68 Melati Mess Hall' });
  (atMelati.meta as { signoff: Record<string, unknown> }).signoff.checkedBy = { userId: 'sup', name: 'Fajar Pengawas', role: 'FOOD_SAFETY_SUPERVISOR', at: new Date().toISOString() };
  await seed(page, { users: [...users, officeMgr], submissions: [atMelati], as: officeMgr });
  await openOpsLogs(page);
  await page.locator('text=Tono Teknisi >> visible=true').first().click();
  await page.getByRole('button', { name: /Stamp — Approved/ }).click();
  await page.getByRole('button', { name: /Stamp without signature/ }).click();
  await expect(page.getByText(/Approved — the log is complete/)).toBeVisible();
  expect((await stored(page, 'l4')).status).toBe('APPROVED');
  // Gone from the queue, now in History.
  await openOpsLogs(page);
  await expect(page.locator('text=Tono Teknisi >> visible=true')).toHaveCount(0);
  const historyNav = page.locator('nav button[title="History"]');
  await historyNav.first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=Tono Teknisi >> visible=true').first()).toBeVisible();
  noErrors();
});
