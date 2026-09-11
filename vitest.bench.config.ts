import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  SOURCE_PLANE_ALIAS,
  standardDecoratorPlugin,
  vitestExecArgv,
} from './vitest.shared.ts'

/**
 * Performance benchmarks (DSH tier 5): benchmarks/ groups user-path
 * gates. Timed code runs under plain Node, never TSX. Synthetic inputs
 * enforce time, heap, and scaling budgets; package-local .perf.ts stays
 * diagnostic. Files run one at a time so a measurement never shares the
 * CPU with another benchmark.
 */
export default defineConfig({
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: { ...SOURCE_PLANE_ALIAS },
  },
  test: {
    environment: 'node',
    pool: 'forks',
    execArgv: vitestExecArgv,
    setupFiles: [PROXY_SETUP],
    include: ['benchmarks/**/*.bench.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 600_000,
    hookTimeout: 120_000,
    disableConsoleIntercept: true,
  },
})
