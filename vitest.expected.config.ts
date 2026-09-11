import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  standardDecoratorPlugin,
  vitestExecArgv,
} from './vitest.shared.ts'

/** Owner-local expected output (DSH tier 4): keyless assembled CLI/process expectations without a recorded-session round trip. Drivers use *.expected.e2e.ts beside tests/expected/. CI runs built exports. */
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
    include: ['tests/expected/**/*.expected.e2e.ts', 'packages/*/*/tests/**/*.expected.e2e.ts'],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    maxWorkers: Math.min(5, availableParallelism()),
  },
})
