import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  positiveIntFromEnv,
  standardDecoratorPlugin,
  vitestExecArgv,
} from './vitest.shared.ts'

const DEFAULT_SNAPSHOT_MAX_CONCURRENCY = 5
const snapshotMaxConcurrency = positiveIntFromEnv(
  'DSH_SNAPSHOT_MAX_CONCURRENCY',
  Math.min(DEFAULT_SNAPSHOT_MAX_CONCURRENCY, availableParallelism()),
)

// Snapshot (DSH tier 6): a top-level scenario's highest recorded parent
// generation supplies user input and model replay, then serves as the
// expected persisted result. Replay is the keyless default; record calls
// the real API and updates fixtures; refresh replays committed scripts.
// Replay/refresh never load .env; only record reads a key.
if (process.env.DSH_SNAPSHOT === 'record') {
  try {
    process.loadEnvFile(new URL('.env', import.meta.url).pathname)
  } catch (error) {
    // ENOENT (no .env) is fine — the key may already be in the environment.
    // Surface any other failure rather than silently recording with wrong env.
    if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
  }
}

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
      // Repository-wide corpus ownership/storage gate (DSH names the
      // same file class first in their include).
      'scripts/session-snapshot-corpus.corpus.ts',
      'snapshots/**/*.snapshot.ts',
    ],
    // Replay never writes committed outputs and every scenario owns its
    // mutable runtime state, so replay runs the snapshot files in
    // parallel and bounds in-file concurrency with the environment knob
    // (value 1 restores fully serial replay on constrained machines).
    // Record and refresh stay serial: record spends real API quota per
    // scenario, and refresh write-back would corrupt expected outputs
    // under concurrent writers.
    testTimeout: 120_000,
    hookTimeout: 30_000,
    fileParallelism: (process.env.DSH_SNAPSHOT || 'replay') === 'replay' && snapshotMaxConcurrency > 1,
    maxConcurrency: snapshotMaxConcurrency,
  },
})
