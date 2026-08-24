# Firebase + Vercel Setup

This app works two ways:

- **No setup (demo mode):** clone it, run it, everything is stored in the
  browser's `localStorage`. Good for trying it out or demoing, but data
  doesn't sync across devices and isn't backed up anywhere.
- **With Firebase (production mode):** real accounts, real login, and role
  assignments that sync everywhere and persist properly. This is what you
  want once real staff are using it.

The app detects which mode to run in automatically, based on whether the
Firebase environment variables below are present. Nothing else changes.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Name it whatever you like (e.g. "psu-fieldops"). Google Analytics is optional — you can skip it.

## 2. Register a Web App

1. In your new project, click the **`</>`** (web) icon to add a web app.
2. Give it a nickname (e.g. "PSU FieldOps Web"). You don't need Firebase Hosting — you're deploying on Vercel.
3. Firebase will show you a `firebaseConfig` object with keys like `apiKey`, `authDomain`, etc. **Keep this tab open** — you'll copy these into Vercel in step 5.

## 3. Enable Authentication

1. In the left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 4. Enable Firestore

1. In the left sidebar: **Build → Firestore Database → Create database**.
2. Start in **production mode** (the app ships its own security rules — see step 7).
3. Pick any region close to your users.

## 5. Enable Storage

1. In the left sidebar: **Build → Storage → Get started**.
2. Start in **production mode** here too (same reason as Firestore — the
   app ships its own rules, see step 7). Same region as Firestore is fine.
3. This is where photo evidence (Housekeeping checklist photos, the
   Technician's daily-log photo) gets uploaded once Firebase is
   configured, instead of being embedded as base64 in each submission —
   see `src/services/storageService.ts`. Nothing to configure beyond
   enabling it; the app picks up `VITE_FIREBASE_STORAGE_BUCKET` from the
   same `firebaseConfig` object as everything else (step 6).

## 6. Add your keys to Vercel

In your Vercel project: **Settings → Environment Variables**, add each of these
(values come from the `firebaseConfig` object from step 2):

| Name | Example |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `psu-fieldops.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `psu-fieldops` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `psu-fieldops.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` |
| `VITE_FIREBASE_APP_ID` | `1:123456789012:web:abcd1234` |

Apply them to all environments (Production, Preview, Development), then
**redeploy** — env vars only take effect on the next build.

(For local development, copy `.env.example` to `.env.local` and fill in the
same values. `.env.local` is already gitignored.)

## 7. Deploy the security rules

The repo includes both `firestore.rules` (locks down who can read/write
user profiles — only the designated admin account can assign roles;
nobody can grant themselves ADMIN) and `storage.rules` (locks down photo
uploads to each uploader's own folder — see the comments in that file).
`firebase.json` already points at both, so one CLI setup covers them:

```bash
npm install -g firebase-tools
firebase login
firebase init   # point it at your existing project; when asked, select
                # both Firestore and Storage, and keep the existing
                # firestore.rules / storage.rules files (don't overwrite)
firebase deploy --only firestore:rules,storage
```

If you skip this step, the app still works, but the security rules
enforced *only* by the client code are the sole protection — not
recommended for a real deployment.

## 8. Create your admin account

Once the env vars are live on Vercel:

1. Open the deployed app.
2. Log in with `mpigome44@gmail.com` and **any password you choose** — this
   specific email is allowed to self-register as Admin (it's the only one
   that can, see `src/services/authService.ts`). This creates both the
   Firebase Auth account and the Admin profile in Firestore, in one step.
3. You're now logged into the Admin Portal. From here, use **Add Staff
   Member** to create profiles (name, role, site) for everyone else.

## 9. How staff activate their accounts

Nobody else can self-register — an admin has to add their email first
(step 7.3). Once added:

1. That person opens the app and logs in with their email and **any
   password they choose** — there's no separate "sign up" screen.
2. Because an admin already created their profile (but no password yet),
   this first login creates their real account and links it.
3. Every login after that is a normal sign-in with that same password.

If someone forgets their password, there's no in-app "forgot password"
flow yet — for now, an admin can deactivate their old profile and create a
fresh invite with the same email, and they'll go through the "first login"
flow again.

## What's still local-only

Submissions, warnings, and training-completion records still live in each
browser's `localStorage` in this version — only user accounts/roles are on
Firestore, and only photo evidence is on Storage. That means submission
history won't currently sync across devices, even in Firebase mode. If you
want those on Firestore too, `src/services/usersService.ts` is a template
for the pattern (a `subscribe*` live-query function + plain async write
functions) — the same shape applies to `submissions`, `warnings`, and
`trainings` collections, plus matching rules added to `firestore.rules`.
