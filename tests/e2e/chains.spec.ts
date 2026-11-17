import { test, expect } from '@playwright/test';
import { U, seed, signInAs, failOnPageErrors, openOpsLogs, stored } from './helpers';

// Every log type, Housekeeping and Food Safety: filed by the role that
// really files it, then walked up its whole sign-off chain by the real
// reviewers through the UI (each finds it in their own Ops Logs queue and
// stamps it), until it's final (APPROVED). Fails if any step has nobody
// who can see or stamp it. Supervisors are at the work site; Managers are
// based at the office (like real accounts) and still receive the logs.
const SITE = 'site-melatimess';
const OFFICE = 'site-townsite';
const people = {
  fsTech: U('fs-tech', 'Tono', 'Teknisi', 'FOOD_SAFETY_TECHNICIAN', SITE),
  fsLead: U('fs-lead', 'Lia', 'Leadhand', 'FOOD_SAFETY_LEADHAND', SITE),
  fsSup: U('fs-sup', 'Fajar', 'Pengawas', 'FOOD_SAFETY_SUPERVISOR', SITE),
  fsMgr: U('fs-mgr', 'Fina', 'Manajer', 'FOOD_SAFETY_MANAGER', OFFICE),
  hk: U('hk', 'Hani', 'Housekeeper', 'HOUSEKEEPER', SITE),
  janitor: U('jan', 'Joko', 'Janitor', 'HOUSEKEEPING_JANITOR', SITE),
  laundry: U('lau', 'Lina', 'Laundry', 'HOUSEKEEPING_LAUNDRY', SITE),
  hkSup: U('hk-sup', 'Sari', 'Pengawas', 'HOUSEKEEPING_SUPERVISOR', SITE),
  hkMgr: U('hk-mgr', 'Maya', 'Manajer', 'HOUSEKEEPING_MANAGER', OFFICE),
};
type P = keyof typeof people;
const STEP_LABEL: Record<string, string> = { checkedBy: 'Checked', approvedBy: 'Approved', verifiedBy: 'Verified' };

// type, filer, then who stamps each step in order.
const CHAINS: [string, P, [string, P][]][] = [
  ['FOOD_SAFETY', 'fsTech', [['checkedBy', 'fsSup'], ['approvedBy', 'fsMgr']]],
  ['TEMP_CONTROL', 'fsTech', [['checkedBy', 'fsSup'], ['approvedBy', 'fsMgr']]],
  ['DISHWASH_TEMP', 'fsTech', [['checkedBy', 'fsSup'], ['approvedBy', 'fsMgr']]],
  ['MESS_HALL_HYGIENE', 'fsSup', [['checkedBy', 'fsMgr'], ['approvedBy', 'fsMgr'], ['verifiedBy', 'fsMgr']]],
  ['COOKING_SERVICE', 'fsLead', [['checkedBy', 'fsSup'], ['approvedBy', 'fsMgr']]],
  ['COOKING_SERVICE', 'fsSup', [['checkedBy', 'fsMgr'], ['approvedBy', 'fsMgr']]],
  ['HOT_PACKED_MEAL', 'fsLead', [['checkedBy', 'fsSup'], ['approvedBy', 'fsMgr']]],
  ['THAWING', 'fsSup', [['checkedBy', 'fsMgr'], ['verifiedBy', 'fsMgr']]],
  ['STAFF_READY', 'fsSup', [['approvedBy', 'fsMgr'], ['verifiedBy', 'fsMgr']]],
  ['GEMBA_WALK', 'fsSup', [['approvedBy', 'fsMgr']]],
  ['HOUSEKEEPING', 'hk', [['checkedBy', 'hkSup'], ['approvedBy', 'hkMgr']]],
  ['RESTROOM', 'janitor', [['checkedBy', 'hkSup'], ['approvedBy', 'hkMgr']]],
  ['LAUNDRY_SHOP', 'laundry', [['checkedBy', 'hkSup'], ['approvedBy', 'hkMgr']]],
  ['GEMBA_WALK', 'hkSup', [['approvedBy', 'hkMgr']]],
];

for (const [type, filerKey, steps] of CHAINS) {
  test(`${type} filed by ${filerKey} goes through ${steps.map(s => `${s[0]}:${s[1]}`).join(' → ')} to APPROVED`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'chain walk runs once (desktop)');
    test.setTimeout(90_000);
    const noErrors = failOnPageErrors(page);
    const filer = people[filerKey];
    const at = new Date().toISOString();
    const log = {
      id: 'c1', userId: filer.id, userName: filer.name, role: filer.role, siteId: SITE, siteName: '68 Melati Mess Hall',
      timestamp: at, type, status: 'PENDING', items: [{ id: 'q1', question: 'Check', answer: true }],
      meta: { date: at.slice(0, 10), signoff: { draftedBy: { userId: filer.id, name: filer.name, at } } },
    };
    await seed(page, { users: Object.values(people), submissions: [log], as: people[steps[0][1]] });
    for (const [step, who] of steps) {
      await signInAs(page, people[who]);
      await openOpsLogs(page);
      await page.locator(`text=${filer.name} >> visible=true`).first().click();
      await page.getByRole('button', { name: new RegExp(`Stamp — ${STEP_LABEL[step]}`) }).click();
      await page.getByRole('button', { name: /Stamp without signature/ }).click();
      await page.waitForTimeout(400);
      const s = await stored(page, 'c1');
      expect(s.meta.signoff[step]?.userId, `${step} stamped by ${who}`).toBe(people[who].id);
    }
    expect((await stored(page, 'c1')).status).toBe('APPROVED');
    noErrors();
  });
}
