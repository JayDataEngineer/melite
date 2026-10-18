import path from 'node:path'
import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  standardDecoratorPlugin,
  vitestExecArgv,
} from './vitest.shared.ts'

/**
 * THE COLD-START TIER (opt-in, 2026-11-08): a scratch ComfyUI core is
 * cloned at infra/comfyui/core.pin, seeded with ComfyUI-Manager at
 * infra/comfyui/manager.pin and NOTHING else, and booted on an
 * ephemeral port against an EMPTY model tree. Every download then has
 * to ride ComfyUI-Manager through the estate's own provider — the
 * warm-machine walls cannot see this path (they judge a store that
 * already holds the bytes), and a rotten download lane stays green
 * there until the first cold user hits it. Never part of the default
 * battery: it needs network, git, and the estate venv, and it runs
 * for minutes. `pnpm run test:coldstart`.
 *
 * One spec file, one engine: the arms share the booted core in
 * order (cold census → extension → model → lora → engine-visible),
 * so the file runs alone (fileParallelism false, maxWorkers 1).
 */
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
    include: ['tests/coldstart/**/*.spec.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 900_000,
    hookTimeout: 900_000,
    disableConsoleIntercept: true,
  },
})
