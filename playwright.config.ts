import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the real app (production build, demo mode — no
// Firebase needed) driven in a browser through the key flows. `npm run
// test:e2e`. CI installs Chromium; locally the preinstalled one is used.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'off',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4300 --strictPort',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Demo mode: make sure no Firebase config leaks into the test build.
    env: { VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_PROJECT_ID: '' },
  },
});
