import { defineConfig } from 'vite';

/**
 * Vite config — tuned for the Zero-Loading budget in RULES.md:
 *   - Total first-paint bundle target: < 300 KB gzipped.
 *   - Single CSS chunk (most CSS lives inline in index.html anyway).
 *   - Inline small assets (<4KB) as data URIs → zero extra requests.
 *   - No module preload polyfill (modern browsers only).
 */
export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
});
