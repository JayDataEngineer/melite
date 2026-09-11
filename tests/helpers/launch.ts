/**
 * tests/helpers/launch.ts — the shared dual-mode launcher (DSH testing.md
 * "Test subprocess launch modes").
 *
 * CI and build-having lanes run every profile or Cordis-config
 * subprocess from built lib/ through this launcher. Do not hand-write
 * `--import tsx` for these subprocesses. Protocol and OS fixtures that
 * do not load Cordis run erasable .ts directly with Node, without tsx
 * or the root paths map. Only a test whose subject is source-path
 * resolution may select src; it states that contract in the test.
 */
import { spawnSync } from 'node:child_process'

export type LaunchMode = 'lib' | 'src'

export interface LaunchOptions {
  /** Built lib/ entry (the default for Cordis-config subprocesses). */
  libEntry: string
  /** Source entry (only when the test's subject is source-path
   * resolution — state that contract in the test). */
  srcEntry?: string
  args?: string[]
  env?: NodeJS.ProcessEnv
  cwd?: string
}

/** Run a subprocess in the requested mode. lib mode runs built output
 * under plain node (exposing settle races, module resolution, and
 * swallowed load failures tsx masks); src mode runs erasable .ts
 * directly with node's type stripping, never tsx. */
export function launchSync(
  mode: LaunchMode,
  opts: LaunchOptions,
): ReturnType<typeof spawnSync> {
  const entry = mode === 'lib' ? opts.libEntry : (opts.srcEntry ?? opts.libEntry)
  const isTs = entry.endsWith('.ts')
  const argv =
    mode === 'src' && isTs
      ? ['--experimental-strip-types', entry, ...(opts.args ?? [])]
      : [entry, ...(opts.args ?? [])]
  return spawnSync(process.execPath, argv, {
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf8',
  })
}
