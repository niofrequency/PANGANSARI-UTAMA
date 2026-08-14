# PSU FieldOps

A mobile-first, installable web app for **Pangansari Utama (PSU) — Food
Resources Solutions**: role-based checklists, photo-verified work orders,
and approvals for Housekeeping and Food Safety teams, plus an admin portal
and analytics dashboard.

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

By default this runs in **demo mode** — no backend required, data is
stored in your browser's localStorage. Good for trying things out.

## Deploying for real use (Vercel + Firebase)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com) — it's a standard Vite app, Vercel will detect it automatically.
2. Follow **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** to create a Firebase project, enable Auth + Firestore, and add your keys as Vercel environment variables.
3. Redeploy. The app automatically switches from demo mode to real accounts/roles once the Firebase env vars are present — no code changes needed.

## Project structure

```
src/
  components/         UI components (portals, auth, layout, install guide)
  components/Portals/  One screen per role (Housekeeper, Supervisor, etc.)
  components/Admin/    Admin Portal (user/role management)
  components/Dashboard/ Analytics dashboard
  i18n/                English/Bahasa Indonesia translations + toggle
  lib/firebase.ts      Firebase init (reads env vars, no-ops if absent)
  services/            Firebase Auth + Firestore data access
  store/useAppStore.ts Central app state — branches between Firebase mode
                        and localStorage demo mode
  data/mockData.ts      Seed data used in demo mode
public/
  manifest.json, sw.js, icons/  PWA install support
firestore.rules          Firestore security rules (deploy via Firebase CLI)
```

## Key features

- **Installable**: works as a normal website, but installs to the home
  screen on Android/iPhone and as a desktop app on Windows/Mac via the
  in-app "Install App" guide.
- **Bilingual**: full English/Bahasa Indonesia toggle, including checklist
  text — not just button labels.
- **Role-based portals**: Housekeeper, Housekeeping Supervisor, Housekeeping
  Manager, Food Safety Technician, Food Safety Supervisor, Food Safety
  Manager, and a locked-down Admin Portal.
- **Admin-managed roles**: only the designated admin account can assign
  staff roles — enforced both client-side and in Firestore security rules.
