/**
 * Wiring test for the shared vitest machinery: every tier config carries
 * the source-plane resolution facade, the standard-decorator plugin,
 * proxy scrubbing, and the fork execArgv — the DSH pathsPlugin law in
 * alias-table form. A config that silently drops one of these keeps
 * running while losing the property it claims (source plane, decorator
 * lowering, known env), so the wiring is pinned here (DSH names the same
 * contract in their test-proxy-environment wiring test).
 */
import { describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROXY_SETUP, SOURCE_PLANE_ALIAS, vitestExecArgv } from '../vitest.shared.ts'

const ROOT = resolve(import.meta.dirname, '..')
const CONFIG_FILES = readdirSync(ROOT).filter((f) => /^vitest\..*config\.ts$/.test(f))

interface ProjectConfig {
  plugins?: unknown[]
  resolve?: { alias?: Record<string, unknown> }
  test?: { setupFiles?: unknown; execArgv?: unknown }
}
interface VitestConfig {
  plugins?: unknown[]
  resolve?: { alias?: Record<string, unknown> }
  test?: { setupFiles?: unknown; execArgv?: unknown; projects?: ProjectConfig[] }
}

async function loadConfig(file: string): Promise<VitestConfig> {
  const mod = (await import(pathToFileURL(join(ROOT, file)).href)) as { default?: VitestConfig } & VitestConfig
  return mod.default ?? mod
}

/** The per-project configs a file contributes: itself when flat, its projects when partitioned. */
async function lanesOf(file: string): Promise<ProjectConfig[]> {
  const cfg = await loadConfig(file)
  if (cfg.test?.projects !== undefined) {
    assert.ok(cfg.test.projects.length > 0, `${file}: projects declared but empty`)
    return cfg.test.projects
  }
  return [cfg as ProjectConfig]
}

const pluginNamed = (plugins: unknown[] | undefined, name: string): boolean =>
  (plugins ?? []).some((p) => typeof p === 'object' && p !== null && 'name' in p && (p as { name: unknown }).name === name)

const FACADE_KEYS = Object.keys(SOURCE_PLANE_ALIAS)

/** CODEGEN FACADE EXCEPTIONS (stroke 77): subpath keys whose only
 *  plane is a BUILD artifact — the drafts/manage/media/runs Typert remote
 *  clients are GENERATED from src/remote.ts's @Remote adapters
 *  (pnpm typert);
 *  no src file exports TYPERT_REMOTE and hand-writing a src shim
 *  would be a redirect stub, not source. The wall demands these
 *  resolve to the artifact path, never src — named, never blanket. */
const CODEGEN_FACADE: Record<string, string> = {
  '@melite/estate-drafts/remote': 'packages/estate/drafts/lib/typert.remote-client.js',
  '@melite/estate-manage/remote': 'packages/estate/manage/lib/typert.remote-client.js',
  '@melite/estate-media/remote': 'packages/estate/media/lib/typert.remote-client.js',
  '@melite/estate-runs/remote': 'packages/estate/runs/lib/typert.remote-client.js',
}

describe('vitest tier wiring', () => {
  it('finds the seven tier configs (root partition + six tiers)', () => {
    assert.deepEqual(
      [...CONFIG_FILES].sort(),
      [
        'vitest.bench.config.ts',
        // the coldstart tier (59fc746e9 — the opt-in scratch-engine
        // battery); the tier landed without re-pinning this wall and
        // the pin red until this recut.
        'vitest.coldstart.config.ts',
        'vitest.config.ts',
        'vitest.e2e.config.ts',
        'vitest.expected.config.ts',
        'vitest.snapshot.config.ts',
        'vitest.web.config.ts',
      ].sort(),
    )
  })

  for (const file of CONFIG_FILES) {
    it(`${file}: every lane carries the full facade, decorator plugin, proxy setup, execArgv`, async () => {
      const lanes = await lanesOf(file)
      for (const lane of lanes) {
        for (const key of FACADE_KEYS) {
          const target = lane.resolve?.alias?.[key]
          assert.ok(typeof target === 'string', `${file}: facade key ${key} missing from a lane`)
          const artifact = CODEGEN_FACADE[key]
          assert.ok(
            artifact !== undefined
              ? (target as string).endsWith(artifact)
              : // The SOURCE plane is the law (a codegen Typert key above
                // is the only built-artifact exception): any face entry
                // under a package's src/ counts — the /client door keys
                // resolve to their own types face (src/client/index.ts),
                // which is source, not an artifact.
                (target as string).includes('/packages/') &&
                (target as string).includes('/src/') &&
                (target as string).endsWith('.ts') &&
                ! (target as string).includes('/lib/'),
            `${file}: facade key ${key} must resolve to ${artifact ?? 'src'}, got ${target}`,
          )
        }
        assert.ok(pluginNamed(lane.plugins, 'melite-standard-decorators'), `${file}: decorator plugin missing from a lane`)
        const setupFiles = lane.test?.setupFiles
        assert.ok(Array.isArray(setupFiles), `${file}: setupFiles missing from a lane`)
        assert.ok(
          (setupFiles as unknown[]).includes(PROXY_SETUP),
          `${file}: proxy setup ${PROXY_SETUP} missing from a lane`,
        )
        assert.deepEqual(lane.test?.execArgv, vitestExecArgv, `${file}: execArgv missing from a lane`)
      }
    })
  }
})

describe('the tmp sweep table is the tree (flake audit §3a, Option A)', () => {
  it('the generated prefix walk sees the minted literals — the sweep never drifts from the tree', async () => {
    const { suitePrefixes } = await import('./tmp-prefixes.mjs')
    const generated = suitePrefixes()
    // the walk must be non-vacuous and duplicate-free
    if (generated.length < 100) throw new Error(`the walk found only ${generated.length} prefixes — the pattern rotted`)
    if (new Set(generated).size !== generated.length) throw new Error('duplicate prefixes')
    // and global-sweep must CONSUME the walk, not a hand copy: the
    // module source names the import, and no hand table grew back
    const sweepSrc = readFileSync(join(ROOT, 'tests/global-sweep.ts'), 'utf8')
    if (!sweepSrc.includes('tmp-prefixes.mjs')) throw new Error('global-sweep.ts no longer imports the generator — a hand table grew back')
    if (/const SUITE_PREFIXES[^=]*=\s*\[/.test(sweepSrc)) throw new Error('a literal prefix table returned — regenerate, never hand-maintain')
  })
})
