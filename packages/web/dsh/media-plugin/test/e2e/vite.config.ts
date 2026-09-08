/**
 * vite build config for the e2e HARNESS page — kept for editor tooling;
 * the canonical build path is build-harness.mjs (resolves vite through
 * vitest's tree, which a plain `vite build` from this package cannot).
 * Shape mirrors the inline config there.
 */
export default {
  root: import.meta.dirname,
  build: {
    outDir: 'dist',
    rollupOptions: { input: 'harness-entry.tsx' },
  },
}
