import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // BOTH sides of the split family, from testkit/: harness members
    // (siblings ../<member>) and web members (../../../web/dsh/*) —
    // ONE runner, ONE command:  cd packages/harness/dsh/testkit && pnpm test
    include: [
      '../melite-tools/test/**/*.test.{ts,tsx}',
      '../../../web/dsh/*/test/**/*.test.{ts,tsx}',
    ],
    // Orphaned bun:test files predate the vitest wiring — exclude until
    // they're converted (the FULL documented set: tools'
    // gateway/provision/build-flow/flow-run/lane-bundle-load + deck's
    // host-routes/ideo-field/events-tunnel + media-plugin's mjs scripts).
    // build-flow/flow-run/events-tunnel still import 'bun:test' — vitest
    // cannot load them (proven pre-existing 2026-09-05, stash-clean);
    // they run under bun from their own package dirs. lane-bundle-load
    // .test.ts is NEW but deliberately bun:test — same zero-dep
    // seam-contract style as gateway.test.ts.
    exclude: [
      '**/node_modules/**',
      '../melite-tools/test/gateway.test.ts',
      '../melite-tools/test/provision-model.test.ts',
      '../melite-tools/test/lane-bundle-load.test.ts',
      '../melite-tools/test/build-flow.test.ts',
      '../melite-tools/test/flow-run.test.ts',
      '../../../web/dsh/melite-card-deck/test/events-tunnel.test.ts',
      '../melite-tools/test/smoke.mjs',
      '../../../web/dsh/media-plugin/test/artifact-range.test.mjs',
      '../../../web/dsh/melite-card-deck/test/host-routes.test.ts',
      '../../../web/dsh/melite-card-deck/test/ideo-field.test.ts',
    ],
    // orphans stay excluded above; every .test.ts in the family today
    // is bun:test (melite-tools) — vitest currently collects NOTHING
    // and exits 0 via passWithNoTests until conversion lands. The
    // bun rail is the real runner: bun test from each package dir.
    passWithNoTests: true,
    css: false,
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'happy-dom'],
    ],
    pool: 'threads',
  },
})
