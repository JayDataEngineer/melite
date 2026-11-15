import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  positiveIntFromEnv,
  standardDecoratorPlugin,
  tryLoadEnvFile,
  vitestExecArgv,
} from './vitest.shared.ts'

// Real-API e2e (DSH testing.md tier 3): with-key tests against live
// provider APIs. Each suite self-skips without its key so keyless CI
// stays green. No coverage — the unit suites own the coverage gate.
tryLoadEnvFile()

const DEFAULT_E2E_MAX_WORKERS = 4
const e2eMaxWorkers = positiveIntFromEnv('DSH_E2E_MAX_WORKERS', DEFAULT_E2E_MAX_WORKERS)

export default defineConfig({
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: { ...resolutionFacade() },
  },
  test: {
    environment: 'node',
    pool: 'forks',
    execArgv: vitestExecArgv,
    setupFiles: [PROXY_SETUP],
    include: [
      'packages/*/*/tests/**/*.e2e.ts',
      'tests/e2e/**/*.e2e.ts',
      // The 3088 lane harness's LIVE gate: it judges the video and 3D
      // (non-Unity) paths against the real estate (the maker's run tree
      // + the engine), and writes a machine-readable verdict that names
      // a blocked prerequisite — a self-skip is not a pass.
      'tests/lane/**/*.e2e.ts',
    ],
    exclude: ['**/*.expected.e2e.ts', 'node_modules/**'],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    // NO RETRIES (operator law 2026-11-17): there is no such thing
    // as a flake — a red that passes on reroll is an ERROR the
    // reroll masked. Every row must prove first-attempt; the retry
    // seat that lived here hid exactly that class (h3 final greened
    // "retry x1" while its first attempt was red). vitest's default
    // is no-retry; this comment is the wall.
    fileParallelism: e2eMaxWorkers > 1,
    maxWorkers: e2eMaxWorkers,
  },
})
