// Lint: React's Rules of Hooks — every hook must run on every render, in
// the same order (a hook after an early `return`, inside an `if`, or in a
// loop crashes the screen with "Rendered fewer hooks than expected" /
// React error #300). Runs in CI (`npm run lint:hooks`).
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'functions/**', 'node_modules/**', 'public/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error' },
  },
);
