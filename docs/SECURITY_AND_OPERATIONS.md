# PSU FieldOps: quality, monitoring and security tooling

## Automated checks on every change (`.github/workflows/ci.yml`)
Every pull request, and every push to `main`, runs these. A red check means: don't merge.

| Check | Command | What it catches |
|---|---|---|
| Type check (app + Cloud Functions) | `npm run typecheck` | Whole classes of bugs before they run. The codebase is at **0 errors** and must stay there. |
| Unit tests (Vitest) | `npm test` | The core rules: who may stamp which step, separation of duties, what reaches whom, what counts as a problem, what each role loads, and chat permissions. In `tests/unit/`. |
| Production build | `npm run build` | Anything that wouldn't deploy. |
| End-to-end (Playwright) | `npm run test:e2e` | A real browser on a phone and a desktop, driving the real app in demo mode: a log going up the chain, Manager → Supervisor send-back and fix, the technician's Rejected tab, every role's portal opening without errors, badges and the dashboard. In `tests/e2e/`. |
| Firestore rules (emulator) | `npm run test:rules` | Security rules (separate workflow, `rules-tests.yml`, and before every rules deploy). |

When you add a feature, add a test next to the closest existing one.

## Error monitoring: Sentry
**Turn it on:**
1. Create a free project at sentry.io (platform: React).
2. Copy its DSN.
3. In Vercel → Project → Settings → Environment Variables, add `VITE_SENTRY_DSN` = the DSN.
4. Redeploy.

**What you get:**
- Every crash and every failed save, with the screen, the phone or browser, the app version (the release is the commit) and the steps leading to it.
- 10% of page loads traced for speed.

**Privacy:**
- **Sent:** the role and the anonymous account id only.
- **Never sent:** names, emails or message text.

**When it's off:** without the variable, Sentry is off and not even downloaded. The app's own error log (Admin → Analytics → App health) keeps working either way.

## "New version available"
After a release, any open app shows a toast: "A new version of PSU FieldOps is ready — Update". Open apps also check for updates every 30 minutes, so phones left open for a whole shift still update.

## Firebase App Check (blocks scripts and bots)
1. **Create a key.** Firebase console → App Check → register the web app with **reCAPTCHA Enterprise**, and copy the site key.
2. **Add it to Vercel.** Set the environment variable `VITE_APPCHECK_SITE_KEY` = that key, then redeploy.
3. **Watch first.** Let it run for a few days, then check that App Check → **Metrics** shows almost all requests as **verified**.
4. **Then enforce.** Click **Enforce** for Cloud Firestore and Storage in the console. For Cloud Functions, enforcement is a code change: add `enforceAppCheck: true` to the callable functions' options. From then on, only the real app can read or write data.

Don't enforce before step 3. Older app versions that are still open would be locked out.

## Backups
See `BACKUP_AND_RESTORE.md`.
