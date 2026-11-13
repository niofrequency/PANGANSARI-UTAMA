// ── Monitoring ───────────────────────────────────────────────────────
// appErrors/{id}: one doc per error — written by the app
// (src/lib/errorReporter.ts) and by Cloud Functions themselves
// (recordServerError below, for scheduled/trigger functions whose
// failures nobody would otherwise see).
//
// errorDigest runs hourly: groups the last hour's errors by fingerprint
// into errorFingerprints/{fp} (first seen, last seen, total count), and
// pushes a notification to every ADMIN when an error type is NEW or
// errors spike. It also deletes appErrors older than 30 days so the
// collection never grows without bound. Admin > Analytics shows the
// grouped list ("App health").

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as crypto from 'crypto';

const SPIKE_PER_HOUR = 25;
const KEEP_DAYS = 30;

export async function recordServerError(source: string, err: unknown): Promise<void> {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const message = `${source}: ${String(e.message || e.name).slice(0, 480)}`;
    const fingerprint = crypto.createHash('sha1').update(message.replace(/\d+/g, '#')).digest('base64url').slice(0, 12);
    await admin.firestore().collection('appErrors').add({
      source: 'server',
      kind: source,
      fingerprint,
      message,
      stack: String(e.stack || '').slice(0, 2000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (inner) {
    console.error('recordServerError failed', inner);
  }
}

// Runs `fn`, recording (then rethrowing) any failure.
export async function monitored<T>(source: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`${source} failed`, err);
    await recordServerError(source, err);
    throw err;
  }
}

interface ErrDoc { fingerprint?: string; message?: string; source?: string; role?: string; appVersion?: string; path?: string }

async function pushToAdmins(db: admin.firestore.Firestore, title: string, body: string): Promise<void> {
  const admins = await db.collection('users').where('role', '==', 'ADMIN').get();
  const uids = admins.docs.map((d) => d.get('uid') as string | undefined).filter((u): u is string => !!u);
  const tokens: string[] = [];
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await db.collection('pushTokens').where('uid', 'in', uids.slice(i, i + 30)).get();
    tokens.push(...snap.docs.map((d) => d.id));
  }
  if (tokens.length === 0) return;
  await admin.messaging().sendEachForMulticast({
    tokens,
    data: { title, body, url: '/', tag: 'app-health' },
    webpush: { headers: { Urgency: 'normal', TTL: '43200' } },
  });
}

export async function runErrorDigest(nowMs = Date.now()): Promise<{ errors: number; newTypes: number; pruned: number }> {
  const db = admin.firestore();
  const since = admin.firestore.Timestamp.fromMillis(nowMs - 60 * 60 * 1000);
  const snap = await db.collection('appErrors').where('createdAt', '>=', since).get();

  const groups = new Map<string, { count: number; sample: ErrDoc }>();
  snap.docs.forEach((d) => {
    const e = d.data() as ErrDoc;
    const fp = e.fingerprint || 'unknown';
    const g = groups.get(fp) || { count: 0, sample: e };
    g.count++;
    groups.set(fp, g);
  });

  const newTypes: ErrDoc[] = [];
  for (const [fp, g] of groups) {
    const ref = db.collection('errorFingerprints').doc(fp);
    const existing = await ref.get();
    const nowTs = admin.firestore.Timestamp.fromMillis(nowMs);
    if (!existing.exists) {
      newTypes.push(g.sample);
      await ref.set({
        message: g.sample.message || '', source: g.sample.source || 'app', path: g.sample.path || '',
        lastAppVersion: g.sample.appVersion || '', firstSeen: nowTs, lastSeen: nowTs, count: g.count,
      });
    } else {
      await ref.update({
        lastSeen: nowTs, count: admin.firestore.FieldValue.increment(g.count),
        lastAppVersion: g.sample.appVersion || existing.get('lastAppVersion') || '',
      });
    }
  }

  if (newTypes.length > 0 || snap.size >= SPIKE_PER_HOUR) {
    const title = newTypes.length > 0
      ? `PSU FieldOps: ${newTypes.length} new error type${newTypes.length > 1 ? 's' : ''}`
      : `PSU FieldOps: ${snap.size} errors in the last hour`;
    const body = (newTypes.length > 0 ? newTypes : [...groups.values()].map((g) => g.sample))
      .slice(0, 3).map((e) => (e.message || '').slice(0, 90)).join('\n');
    await pushToAdmins(db, title, body).catch((err) => console.error('pushToAdmins failed', err));
  }

  // Retention.
  const cutoff = admin.firestore.Timestamp.fromMillis(nowMs - KEEP_DAYS * 24 * 60 * 60 * 1000);
  const old = await db.collection('appErrors').where('createdAt', '<', cutoff).limit(450).get();
  if (!old.empty) {
    const batch = db.batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return { errors: snap.size, newTypes: newTypes.length, pruned: old.size };
}

export const errorDigest = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Jayapura', region: 'us-central1', timeoutSeconds: 120 },
  async () => {
    const result = await runErrorDigest();
    console.log('errorDigest', result);
  }
);
