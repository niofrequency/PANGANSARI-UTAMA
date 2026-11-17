import { defineConfig } from 'vitest/config';

// Unit tests for the app's core rules (who can stamp, what's a problem,
// what each role loads, chat permissions…). `npm test`. Firestore rules
// have their own emulator suite (`npm run test:rules`), and end-to-end
// flows run in Playwright (`npm run test:e2e`).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
