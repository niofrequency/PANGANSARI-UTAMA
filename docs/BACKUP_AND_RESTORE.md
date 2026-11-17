# PSU FieldOps — Backup & Restore

If data is lost or damaged (a bad deploy, a mistaken bulk change, a deleted record), it can be brought back. There are four independent layers, from the most precise to the most durable.

| # | Layer | What it keeps | How far back | Survives the database being deleted? |
|---|---|---|---|---|
| 1 | **Point-in-time recovery (PITR)** | The whole database, as it was at any minute | 7 days | No |
| 2 | **Managed backups** | Full database snapshots: daily, and weekly on Sundays | Daily kept 7 days; weekly kept 14 weeks | Yes (they are separate resources) |
| 3 | **Monthly export** (function `monthlyFirestoreExport`) | Full export on the 1st of each month, 02:00 WIT, to `gs://<project>-firestore-exports/<date>` | ~13 months (bucket lifecycle deletes after 400 days) | Yes, and it can be imported into a different project |
| 4 | **Photo soft delete** (Cloud Storage) | Any deleted or overwritten photo | 30 days | n/a |

There are three extra safety nets as well:
- **Delete protection** is on, so nobody can delete the database by accident.
- **Records are never really deleted.** Deleting a log only sets `deletedAt`, and `allow delete: if false` in the rules blocks a real delete.
- **Firestore rules are in git**, so any rules change can be rolled back.

The deploy workflow (`.github/workflows/deploy-functions.yml`) sets up layers 1–4 on every deploy. It's idempotent, so it skips anything already in place. Check that the deploy log's backup steps say **done**, not **skipped**.

### Permissions the deploy service account needs
- **Cloud Datastore Owner** (backups, PITR, delete protection)
- **Storage Admin** (backup bucket, soft delete)
- **Project IAM Admin** (granting the export permissions)

Without them, those steps are skipped and the log says why. Grant them in Google Cloud Console → IAM, on the account named in the `FIREBASE_SERVICE_ACCOUNT` secret.

---

## Restoring

Always restore into a **new** database first. Check it, then switch over or copy back only what's needed. Never overwrite the live database blind.

### A. "Something went wrong in the last 7 days" (PITR)
Example: a bad change at 14:05 today.
```bash
gcloud firestore databases clone --project=PROJECT \
  --source-database='projects/PROJECT/databases/(default)' \
  --snapshot-time=2026-11-17T05:00:00Z \
  --destination-database=restore-2026-11-17
```
`--snapshot-time` is in UTC (WIT is UTC+9) and must be a whole minute. Inspect `restore-2026-11-17` in the Firebase console, then copy the needed documents back, or point the app at it (see D).

### B. From a daily or weekly backup
```bash
gcloud firestore backups list --project=PROJECT --location=us-central1
gcloud firestore databases restore --project=PROJECT \
  --source-backup=projects/PROJECT/locations/us-central1/backups/BACKUP_ID \
  --destination-database=restore-from-backup
```

### C. From a monthly export (also works into a brand-new project)
```bash
gcloud storage ls gs://PROJECT-firestore-exports/
gcloud firestore import gs://PROJECT-firestore-exports/2026-11-01 --project=TARGET_PROJECT --database='(default)'
```

### D. Switching the app to a restored database
Only do this if the live database itself is beyond repair: the app and functions read `(default)`. The usual path is to copy the affected collections back from the restored database (a small admin script, or the console for a few documents).

### E. A deleted photo
Within 30 days:
```bash
gcloud storage ls --soft-deleted gs://PROJECT.firebasestorage.app/submissions/UID/
gcloud storage restore gs://PROJECT.firebasestorage.app/submissions/UID/FILE#GENERATION
```

### F. A log someone "deleted" in the app
It's still there with `deletedAt` set. Clear `deletedAt` / `deletedBy` on that document in the Firebase console.

---

## Test a restore every quarter
A backup that has never been restored is a hope, not a backup.
1. Run **A** for "yesterday 10:00" into `restore-test`.
2. In the console, check that a few recent logs, users and chat messages are there.
3. Delete `restore-test`:
   ```bash
   gcloud firestore databases delete --database=restore-test --project=PROJECT
   ```
4. Note the date and who did it here:

| Date | By | Result |
|---|---|---|
| | | |
