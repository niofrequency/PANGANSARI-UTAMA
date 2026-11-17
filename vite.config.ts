import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import fs from 'fs';
import crypto from 'crypto';

// Writes this build's id and full file list into dist/sw.js so every
// screen and form is cached for offline use (see public/sw.js).
function precacheServiceWorker(): Plugin {
  let files: string[] = [];
  return {
    name: 'psu-precache-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      files = Object.keys(bundle).filter((f) => /\.(js|css|woff2?|png|svg|webp)$/.test(f)).map((f) => `/${f}`);
    },
    writeBundle(opts) {
      const out = path.join(opts.dir || 'dist', 'sw.js');
      if (!fs.existsSync(out)) return;
      const id = crypto.createHash('sha1').update(files.sort().join('|')).digest('hex').slice(0, 10);
      const src = fs.readFileSync(out, 'utf8')
        .replace("'__BUILD_ID__'", JSON.stringify(id))
        .replace('/*__PRECACHE__*/[]', JSON.stringify(files));
      fs.writeFileSync(out, src);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), precacheServiceWorker()],
    // Which build an error report came from (src/lib/errorReporter.ts).
    // Vercel sets VERCEL_GIT_COMMIT_SHA at build time.
    define: {
      __APP_VERSION__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)),
    },
    // Split the big, rarely-changing libraries into their own cached files
    // (an app update then only re-downloads the app code, not Firebase).
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
            if (id.includes('motion') || id.includes('framer')) return 'motion';
            // Everything else shared (incl. bundler helpers) — keeps the
            // charts file from being pulled in at start-up by a helper.
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
