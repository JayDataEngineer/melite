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
    include: ['packages/*/*/tests/**/*.e2e.ts', 'tests/e2e/**/*.e2e.ts'],
    exclude: ['**/*.expected.e2e.ts', 'node_modules/**'],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    retry: 2,
    // Run files in a bounded pool: enough lower-level parallelism to keep CI
    // and local with-key runs moving, while leaving a resource knob for shared
    // API quotas (`DSH_E2E_MAX_WORKERS=1` restores serial execution).
    fileParallelism: e2eMaxWorkers > 1,
    maxWorkers: e2eMaxWorkers,
  },
})
