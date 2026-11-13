// ── Missed-check alerts ──────────────────────────────────────────────
// Every 30 minutes, compares each active check schedule
// (checkSchedules/{id}, set up by an Admin or Manager in the app — see
// src/components/Checks/CheckSchedulePanel.tsx) against what was actually
// submitted, and records any slot that's past due as a
// missedChecks/{scheduleId}_{date}_{slot} doc. Each new miss is pushed to
// that site's Supervisors / Leadhands / Managers of the same department
// (the same people who can see that site in the app — see
// src/lib/siteScope.ts). If the check is filled in late, the doc gets
// `resolvedAt` so the app shows it as "done late" instead of open.
//
// Dates/times are PSU's local time: Papua (WIT, UTC+9, no daylight
// saving). The forms' own `meta.date` fields are written from the
// device's local date (src/utils/localDate.ts), which on PSU's phones is
// this same zone.

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const TIME_ZONE = 'Asia/Jayapura';
const TZ_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_MINUTES = 60;

type Department = 'HOUSEKEEPING' | 'FOOD_SAFETY';

interface CheckSchedule {
  siteId: string;
  siteName?: string;
  type: string;
  department: Department;
  label: string;
  assetId?: string;
  section?: string;
  slots: string[];
  graceMinutes?: number;
  days?: number[]; // 0 = Sunday … 6 = Saturday; empty/missing = every day
  active?: boolean;
  createdAt?: string;
}

interface SubmissionDoc {
  type: string;
  siteId: string;
  timestamp: string;
  deletedAt?: string;
  meta?: {
    assetId?: string;
    date?: string;
    slot?: string;
    section?: string;
    tempReadings?: Record<string, { temp?: string; at?: string }>;
    dishwashReadings?: Record<string, { cuci?: string; bilas?: string; at?: string }>;
  };
}

interface MissedCheckDoc {
  scheduleId: string;
  siteId: string;
  siteName: string;
  department: Department;
  type: string;
  label: string;
  slot: string;
  date: string;
  dueAt: string;
  detectedAt: string;
  resolvedAt?: string;
}

const DEPT_ROLES: Record<Department, string[]> = {
  FOOD_SAFETY: ['FOOD_SAFETY_SUPERVISOR', 'FOOD_SAFETY_LEADHAND', 'FOOD_SAFETY_MANAGER'],
  HOUSEKEEPING: ['HOUSEKEEPING_SUPERVISOR', 'HOUSEKEEPING_LEADHAND', 'HOUSEKEEPING_MANAGER'],
};

// 'YYYY-MM-DD' in PSU local time for an instant.
export function localDay(ms: number): string {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function dayStartMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) - TZ_OFFSET_MS;
}

function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

// '08' / '12' / '24' (form slot keys) or 'HH:MM' (a plain due time).
// '24' is the paper form's midnight column: due at the end of the day.
export function slotMinutes(slot: string): number {
  if (slot.includes(':')) {
    const [h, m] = slot.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const h = Number(slot);
  return h >= 24 ? 23 * 60 + 59 : h * 60;
}

function slotLabel(slot: string): string {
  return slot.includes(':') ? slot : `${slot.padStart(2, '0')}:00`;
}

function sameLocalDay(iso: string | undefined, day: string): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  return !Number.isNaN(ms) && localDay(ms) === day;
}

// Was this slot of this schedule done on `day`, given that day's
// submissions for the schedule's site + form type?
export function slotDone(s: CheckSchedule, slot: string, slotIndex: number, day: string, subs: SubmissionDoc[]): boolean {
  const mine = subs.filter((x) => !x.deletedAt && (!s.assetId || x.meta?.assetId === s.assetId));
  // A reading carries its own `at` time; use that when present, since
  // older records stored meta.date in UTC (wrong before 09:00 WIT).
  const readingOnDay = (sub: SubmissionDoc, at?: string) => (at ? sameLocalDay(at, day) : sub.meta?.date === day);
  switch (s.type) {
    case 'TEMP_CONTROL':
      return mine.some((x) => {
        const r = x.meta?.tempReadings?.[slot];
        return !!r?.temp && readingOnDay(x, r.at);
      });
    case 'DISHWASH_TEMP':
      return mine.some((x) => {
        const r = x.meta?.dishwashReadings?.[slot];
        return !!(r?.cuci || r?.bilas) && readingOnDay(x, r.at);
      });
    case 'RESTROOM':
      return mine.some((x) =>
        x.meta?.slot === slot &&
        (!s.section || (x.meta?.section || '').trim().toUpperCase() === s.section.trim().toUpperCase()) &&
        sameLocalDay(x.timestamp, day)
      );
    default: {
      // Plain daily forms: N due times means N submissions expected that
      // day; the i-th due time is met once there are at least i+1.
      const count = mine.filter((x) => sameLocalDay(x.timestamp, day) || x.meta?.date === day).length;
      return count >= slotIndex + 1;
    }
  }
}

interface UserDoc {
  uid?: string;
  role?: string;
  site?: string;
  assignedSites?: string[] | 'ALL';
  isActive?: boolean;
}

function userCoversSite(u: UserDoc, siteId: string): boolean {
  if (u.isActive === false || !u.uid) return false;
  const a = u.assignedSites;
  if (a === 'ALL') return true;
  if (Array.isArray(a) && a.length > 0) return a.includes(siteId);
  return u.site === siteId;
}

async function notify(db: admin.firestore.Firestore, newMisses: MissedCheckDoc[]): Promise<void> {
  if (newMisses.length === 0) return;
  const usersByDept = new Map<Department, UserDoc[]>();
  const groups = new Map<string, MissedCheckDoc[]>();
  for (const m of newMisses) {
    const key = `${m.siteId}|${m.department}`;
    groups.set(key, [...(groups.get(key) || []), m]);
  }

  for (const [key, misses] of groups) {
    const [siteId, department] = key.split('|') as [string, Department];
    if (!usersByDept.has(department)) {
      const snap = await db.collection('users').where('role', 'in', DEPT_ROLES[department]).get();
      usersByDept.set(department, snap.docs.map((d) => d.data() as UserDoc));
    }
    const uids = usersByDept.get(department)!.filter((u) => userCoversSite(u, siteId)).map((u) => u.uid!);
    if (uids.length === 0) continue;

    const tokens: string[] = [];
    for (let i = 0; i < uids.length; i += 30) {
      const snap = await db.collection('pushTokens').where('uid', 'in', uids.slice(i, i + 30)).get();
      tokens.push(...snap.docs.map((d) => d.id));
    }
    if (tokens.length === 0) continue;

    const siteName = misses[0].siteName || siteId;
    const lines = misses.slice(0, 4).map((m) => `${m.label} · ${slotLabel(m.slot)}`);
    if (misses.length > 4) lines.push(`+${misses.length - 4} more`);
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        title: misses.length === 1 ? `Missed check · ${siteName}` : `${misses.length} missed checks · ${siteName}`,
        body: lines.join('\n'),
        url: '/?tab=checks',
        tag: `missed-${siteId}-${department}-${misses[0].date}`,
      },
      webpush: { headers: { Urgency: 'high', TTL: '21600' } },
    });
    const dead: Promise<unknown>[] = [];
    response.responses.forEach((r, i) => {
      const code = r.error?.code || '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
        dead.push(db.collection('pushTokens').doc(tokens[i]).delete());
      }
    });
    await Promise.all(dead);
  }
}

export async function runMissedCheckSweep(nowMs = Date.now()): Promise<{ created: number; resolved: number }> {
  const db = admin.firestore();
  const today = localDay(nowMs);
  const yesterday = localDay(nowMs - DAY_MS);
  const nowIso = new Date(nowMs).toISOString();

  const schedSnap = await db.collection('checkSchedules').get();
  const schedules = schedSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CheckSchedule) }))
    .filter((s) => s.active !== false && s.siteId && s.type && Array.isArray(s.slots) && s.slots.length > 0);
  if (schedules.length === 0) return { created: 0, resolved: 0 };

  const existingSnap = await db.collection('missedChecks').where('date', '>=', yesterday).get();
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data() as MissedCheckDoc]));

  const subsCache = new Map<string, SubmissionDoc[]>();
  const subsFor = async (siteId: string, type: string): Promise<SubmissionDoc[]> => {
    const key = `${siteId}|${type}`;
    if (!subsCache.has(key)) {
      // From the start of yesterday minus a day (covers old UTC-dated
      // records) up to now.
      const from = new Date(dayStartMs(yesterday) - DAY_MS).toISOString();
      const snap = await db.collection('submissions')
        .where('siteId', '==', siteId)
        .where('type', '==', type)
        .where('timestamp', '>=', from)
        .get();
      subsCache.set(key, snap.docs.map((d) => d.data() as SubmissionDoc));
    }
    return subsCache.get(key)!;
  };

  const batch = db.batch();
  const newMisses: MissedCheckDoc[] = [];
  let resolved = 0;

  for (const s of schedules) {
    const createdMs = s.createdAt ? Date.parse(s.createdAt) : 0;
    const grace = (s.graceMinutes ?? DEFAULT_GRACE_MINUTES) * 60 * 1000;
    const slots = [...s.slots].sort((a, b) => slotMinutes(a) - slotMinutes(b));

    for (const day of [yesterday, today]) {
      if (Array.isArray(s.days) && s.days.length > 0 && !s.days.includes(weekday(day))) continue;
      const due = slots
        .map((slot, i) => ({ slot, i, dueMs: dayStartMs(day) + slotMinutes(slot) * 60 * 1000 }))
        // Past its grace period, and not due before the schedule existed.
        .filter((x) => x.dueMs + grace <= nowMs && x.dueMs >= createdMs);
      if (due.length === 0) continue;

      const subs = await subsFor(s.siteId, s.type);
      for (const { slot, i, dueMs } of due) {
        const id = `${s.id}_${day}_${slot.replace(':', '')}`;
        const done = slotDone(s, slot, i, day, subs);
        const prior = existing.get(id);
        if (!done && !prior) {
          const doc: MissedCheckDoc = {
            scheduleId: s.id,
            siteId: s.siteId,
            siteName: s.siteName || s.siteId,
            department: s.department,
            type: s.type,
            label: s.label,
            slot,
            date: day,
            dueAt: new Date(dueMs).toISOString(),
            detectedAt: nowIso,
          };
          batch.set(db.collection('missedChecks').doc(id), doc);
          newMisses.push(doc);
        } else if (done && prior && !prior.resolvedAt) {
          batch.update(db.collection('missedChecks').doc(id), { resolvedAt: nowIso });
          resolved++;
        }
      }
    }
  }

  if (newMisses.length > 0 || resolved > 0) await batch.commit();
  await notify(db, newMisses);
  return { created: newMisses.length, resolved };
}

export const checkMissedChecks = onSchedule(
  { schedule: 'every 30 minutes', timeZone: TIME_ZONE, region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    const result = await runMissedCheckSweep();
    console.log('checkMissedChecks', result);
  }
);
