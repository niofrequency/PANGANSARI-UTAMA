// Off-site monthly export of the whole Firestore database.
//
// Backup layers (docs/BACKUP_AND_RESTORE.md):
//   1. Point-in-time recovery — any minute in the last 7 days.
//   2. Managed backups — daily (kept 7 days) and weekly (kept 14 weeks).
//   3. THIS: a full export on the 1st of every month to a separate Cloud
//      Storage bucket (gs://<project>-firestore-exports), kept ~13 months
//      by the bucket's lifecycle rule. It lives outside the database, so it
//      survives even if the database itself were deleted, and it can be
//      imported into a brand-new project.
// Bucket, lifecycle and permissions are set up by the deploy workflow.
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { monitored } from './monitoring';

export async function runFirestoreExport(now = new Date()): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;
  if (!projectId) throw new Error('No project id');
  const client = new admin.firestore.v1.FirestoreAdminClient();
  const stamp = now.toISOString().slice(0, 10);
  const [op] = await client.exportDocuments({
    name: client.databasePath(projectId, '(default)'),
    outputUriPrefix: `gs://${projectId}-firestore-exports/${stamp}`,
    collectionIds: [], // every collection
  });
  return String(op.name);
}

export const monthlyFirestoreExport = onSchedule(
  { schedule: '0 2 1 * *', timeZone: 'Asia/Jayapura', region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    const op = await monitored('monthlyFirestoreExport', () => runFirestoreExport());
    console.log('monthlyFirestoreExport started', op);
  },
);
