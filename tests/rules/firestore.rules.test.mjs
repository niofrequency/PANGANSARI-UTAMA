// Security-rule tests for firestore.rules, run against the Firestore
// emulator:  npm run test:rules
// Each test pins down one thing the rules must keep true — mostly "this
// person must NOT be able to do that". If a rules change breaks one, CI
// fails before the change can be deployed.

import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, serverTimestamp, Timestamp,
} from 'firebase/firestore';

const SUPER = 'mpigome44@gmail.com';
let env;

const people = {
  superAdmin: { uid: 'u-super', email: SUPER, role: 'ADMIN', site: 'site-a' },
  admin: { uid: 'u-admin', email: 'admin@psu.test', role: 'ADMIN', site: 'site-a' },
  fsManager: { uid: 'u-fsm', email: 'fsm@psu.test', role: 'FOOD_SAFETY_MANAGER', site: 'site-a' },
  fsSupervisor: { uid: 'u-fss', email: 'fss@psu.test', role: 'FOOD_SAFETY_SUPERVISOR', site: 'site-a' },
  fsSupervisorB: { uid: 'u-fssb', email: 'fssb@psu.test', role: 'FOOD_SAFETY_SUPERVISOR', site: 'site-b' },
  tech: { uid: 'u-tech', email: 'tech@psu.test', role: 'FOOD_SAFETY_TECHNICIAN', site: 'site-a' },
  tech2: { uid: 'u-tech2', email: 'tech2@psu.test', role: 'FOOD_SAFETY_TECHNICIAN', site: 'site-a' },
  housekeeper: { uid: 'u-hk', email: 'hk@psu.test', role: 'HOUSEKEEPER', site: 'site-a' },
};

const as = (p) => env.authenticatedContext(p.uid, { email: p.email }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-psu-rules',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});

after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const p of Object.values(people)) {
      await setDoc(doc(db, 'users', p.email), { name: p.uid, email: p.email, uid: p.uid, role: p.role, site: p.site, isActive: true });
    }
    await setDoc(doc(db, 'submissions', 'sub-pending'), {
      userId: people.tech.uid, userName: 'tech', role: 'FOOD_SAFETY_TECHNICIAN', siteId: 'site-a', siteName: 'A',
      timestamp: '2026-11-01T00:00:00.000Z', type: 'TEMP_CONTROL', status: 'PENDING', items: [], meta: {},
    });
    await setDoc(doc(db, 'correctiveActions', 'ca-1'), {
      createdById: people.fsSupervisor.uid, assignedToId: people.tech.uid, status: 'OPEN', title: 'Fix seal',
    });
    await setDoc(doc(db, 'missedChecks', 'm-1'), { siteId: 'site-a', date: '2026-11-01', label: 'x' });
    await setDoc(doc(db, 'pushTokens', 'tok-1'), { uid: people.tech.uid, email: people.tech.email });
  });
});

// ── users ──────────────────────────────────────────────────────────
test('signed-out visitors can look up one profile but not list everyone', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'users', people.tech.email)));
  await assertFails(getDocs(collection(anon(), 'users')));
});

test('self-signup can create own profile, but never as ADMIN', async () => {
  const newbie = { uid: 'u-new', email: 'new@psu.test' };
  const base = { email: newbie.email, uid: newbie.uid, isActive: true, site: 'site-a', name: 'New' };
  await assertFails(setDoc(doc(as(newbie), 'users', newbie.email), { ...base, role: 'ADMIN' }));
  await assertSucceeds(setDoc(doc(as(newbie), 'users', newbie.email), { ...base, role: 'HOUSEKEEPER' }));
});

test('nobody can change their own role', async () => {
  await assertFails(updateDoc(doc(as(people.tech), 'users', people.tech.email), { role: 'ADMIN' }));
  await assertFails(updateDoc(doc(as(people.fsSupervisor), 'users', people.fsSupervisor.email), { role: 'FOOD_SAFETY_MANAGER' }));
});

test('a manager can edit staff, but cannot touch or create ADMIN accounts', async () => {
  const m = as(people.fsManager);
  await assertSucceeds(updateDoc(doc(m, 'users', people.tech.email), { site: 'site-b' }));
  await assertFails(updateDoc(doc(m, 'users', people.tech.email), { role: 'ADMIN' }));
  await assertFails(updateDoc(doc(m, 'users', people.admin.email), { site: 'site-b' }));
  await assertFails(deleteDoc(doc(m, 'users', people.admin.email)));
  await assertFails(setDoc(doc(m, 'users', 'x@psu.test'), { email: 'x@psu.test', role: 'ADMIN', isActive: true }));
});

test('only the super-admin can edit the super-admin account; nobody can delete it', async () => {
  await assertFails(updateDoc(doc(as(people.admin), 'users', SUPER), { role: 'HOUSEKEEPER' }));
  await assertFails(deleteDoc(doc(as(people.admin), 'users', SUPER)));
  await assertSucceeds(updateDoc(doc(as(people.superAdmin), 'users', SUPER), { site: 'site-b' }));
});

test('supervisors and frontline cannot create accounts or staff codes', async () => {
  await assertFails(setDoc(doc(as(people.fsSupervisor), 'users', 'y@psu.test'), { email: 'y@psu.test', role: 'HOUSEKEEPER', isActive: true }));
  await assertFails(setDoc(doc(as(people.tech), 'staffCodes', '9999'), { email: people.tech.email }));
});

// ── submissions ────────────────────────────────────────────────────
test('a submission must be filed as yourself and start PENDING', async () => {
  const db = as(people.tech);
  const ok = { userId: people.tech.uid, status: 'PENDING', type: 'TEMP_CONTROL', siteId: 'site-a', items: [] };
  await assertSucceeds(addDoc(collection(db, 'submissions'), ok));
  await assertFails(addDoc(collection(db, 'submissions'), { ...ok, status: 'APPROVED' }));
  await assertFails(addDoc(collection(db, 'submissions'), { ...ok, userId: people.tech2.uid }));
  await assertFails(addDoc(collection(anon(), 'submissions'), ok));
});

test('the filer cannot approve their own submission', async () => {
  await assertFails(updateDoc(doc(as(people.tech), 'submissions', 'sub-pending'), { status: 'APPROVED' }));
});

test('a reviewer can stamp a pending submission but not rewrite its answers', async () => {
  const sup = as(people.fsSupervisor);
  await assertSucceeds(updateDoc(doc(sup, 'submissions', 'sub-pending'), { status: 'APPROVED', 'meta.signoff': { checkedBy: { name: 'x' } } }));
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'submissions', 'sub-pending'), { status: 'PENDING' }));
  await assertFails(updateDoc(doc(sup, 'submissions', 'sub-pending'), { items: [{ id: 'x', question: 'q', answer: 'faked' }] }));
});

test('submissions can never be hard-deleted', async () => {
  await assertFails(deleteDoc(doc(as(people.tech), 'submissions', 'sub-pending')));
  await assertFails(deleteDoc(doc(as(people.admin), 'submissions', 'sub-pending')));
});

// ── corrective actions ─────────────────────────────────────────────
test('the assignee can mark an action done but cannot verify it themselves', async () => {
  const t = as(people.tech);
  await assertFails(updateDoc(doc(t, 'correctiveActions', 'ca-1'), { status: 'VERIFIED', verifiedAt: 'now' }));
  await assertSucceeds(updateDoc(doc(t, 'correctiveActions', 'ca-1'), { status: 'DONE', completedAt: 'now' }));
  await assertFails(updateDoc(doc(t, 'correctiveActions', 'ca-1'), { status: 'VERIFIED', verifiedAt: 'now' }));
  await assertSucceeds(updateDoc(doc(as(people.fsSupervisor), 'correctiveActions', 'ca-1'), { status: 'VERIFIED', verifiedAt: 'now' }));
});

// ── chat ───────────────────────────────────────────────────────────
function msg(from, to, extra = {}) {
  return {
    fromId: from.uid, fromEmail: from.email, toId: to.uid, toEmail: to.email,
    participants: [from.uid, to.uid], read: false, text: 'hello', sentAt: serverTimestamp(), ...extra,
  };
}

test('frontline can message their own site supervisor, not a manager or another site', async () => {
  await assertSucceeds(addDoc(collection(as(people.tech), 'messages'), msg(people.tech, people.fsSupervisor)));
  await assertFails(addDoc(collection(as(people.tech), 'messages'), msg(people.tech, people.fsManager)));
  await assertFails(addDoc(collection(as(people.tech), 'messages'), msg(people.tech, people.fsSupervisorB)));
  await assertFails(addDoc(collection(as(people.tech), 'messages'), msg(people.tech, people.tech2)));
});

test('nobody can send a message as someone else', async () => {
  await assertFails(addDoc(collection(as(people.tech2), 'messages'), msg(people.tech, people.fsSupervisor)));
});

test('only the two participants can read a message', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'messages', 'msg-1'), {
    ...msg(people.tech, people.fsSupervisor), sentAt: Timestamp.now(),
  }));
  await assertSucceeds(getDoc(doc(as(people.fsSupervisor), 'messages', 'msg-1')));
  await assertFails(getDoc(doc(as(people.tech2), 'messages', 'msg-1')));
  await assertFails(getDoc(doc(as(people.fsManager), 'messages', 'msg-1')));
});

test('a message can no longer be edited after 15 minutes', async () => {
  const old = Timestamp.fromMillis(Date.now() - 20 * 60 * 1000);
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'messages', 'msg-old'), {
    ...msg(people.tech, people.fsSupervisor), sentAt: old,
  }));
  await assertFails(updateDoc(doc(as(people.tech), 'messages', 'msg-old'), { text: 'changed', editedAt: 'now' }));
});

// ── push tokens ────────────────────────────────────────────────────
test('push tokens are never readable from the app', async () => {
  await assertFails(getDoc(doc(as(people.tech), 'pushTokens', 'tok-1')));
  await assertFails(getDoc(doc(as(people.admin), 'pushTokens', 'tok-1')));
});

// ── missed-check alerts ────────────────────────────────────────────
test('managers and admins can edit check schedules; supervisors and frontline cannot', async () => {
  const sched = { siteId: 'site-a', type: 'TEMP_CONTROL', slots: ['08'], active: true };
  await assertSucceeds(setDoc(doc(as(people.fsManager), 'checkSchedules', 's1'), sched));
  await assertSucceeds(setDoc(doc(as(people.admin), 'checkSchedules', 's2'), sched));
  await assertFails(setDoc(doc(as(people.fsSupervisor), 'checkSchedules', 's3'), sched));
  await assertFails(setDoc(doc(as(people.tech), 'checkSchedules', 's4'), sched));
  await assertSucceeds(getDoc(doc(as(people.fsSupervisor), 'checkSchedules', 's1')));
});

test('missed checks are readable by staff but written only by the server', async () => {
  await assertSucceeds(getDoc(doc(as(people.fsSupervisor), 'missedChecks', 'm-1')));
  await assertFails(updateDoc(doc(as(people.admin), 'missedChecks', 'm-1'), { resolvedAt: 'now' }));
  await assertFails(deleteDoc(doc(as(people.fsManager), 'missedChecks', 'm-1')));
  await assertFails(getDoc(doc(anon(), 'missedChecks', 'm-1')));
});
