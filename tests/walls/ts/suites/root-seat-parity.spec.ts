import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

// root-seat-parity — THE ROOT SEAT WALL (LAW 4): the repo root package
// ("melite") is the DSH plugin-install seat — `dsh plugin --profile <name>
// add github:JayDataEngineer/melite#<ref>` lands the root package as the
// profile's one new direct dependency, and the plugin manager appends it to
// `dsh.profile.bundles` because the manifest declares `dsh.bundle.patch`
// (the reconcile seam in @deepseek-ai/dsh-plugin-manager: only NEW DIRECT
// dependencies carrying `dsh.bundle.patch` join the composition). The root
// patch therefore must carry the rows the carrier packages would have
// carried themselves, derived from their own cordis.patch.yml files so the
// dsh-plugin-add channel and the consumer-install renderer can never drift
// apart (the parity law, packages/harness/provisioner/bin/infer-provision.mjs).
// Every arm here rides the real files and the real generator — no frozen
// literals: a carrier patch edit, a manifest edit, or a stale render reds.

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  name?: string
  private?: boolean
  engines?: Record<string, string>
  dsh?: { bundle?: { patch?: string } }
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
const PATCH_TEXT = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')

/** The seat rows the generator renders, plus the derivation source list. */
function renderedRows(): Array<Record<string, unknown>> {
  const body = PATCH_TEXT.slice(PATCH_TEXT.indexOf('\n', PATCH_TEXT.lastIndexOf('# runtime form')) + 1)
  const parsed = parse(body) as unknown
  if (!Array.isArray(parsed)) throw new Error('cordis.patch.yml: the rendered rows are not a list')
  return parsed as Array<Record<string, unknown>>
}

/** The generator's carrier table (name + package dir, PROFILE_BASES order). */
function carrierTable(): Array<[string, string]> {
  const source = readFileSync(join(ROOT, 'tools/render-seat-patch.mjs'), 'utf8')
  const block = /const CARRIERS = \[([\s\S]*?)\n\]/.exec(source)
  expect(block, 'tools/render-seat-patch.mjs declares its CARRIERS table').toBeTruthy()
  return [...block![1].matchAll(/\['([^']+)', '([^']+)'\]/g)].map((m) => [m[1]!, m[2]!] as [string, string])
}

/** The melite carriers consumer-install mounts for the studio profile, in
 *  PROFILE_BASES['melite-test'] order (the in-box @deepseek-ai rows excluded:
 *  they are DSH installation bundles, never seat dependencies). */
function consumerInstallCarriers(): string[] {
  const source = readFileSync(join(ROOT, 'tools/consumer-install.mjs'), 'utf8')
  const block = /'melite-test': \[([\s\S]*?)\]/.exec(source)
  expect(block, 'tools/consumer-install.mjs declares PROFILE_BASES melite-test').toBeTruthy()
  return [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1]!).filter((name) => !name.startsWith('@deepseek-ai/'))
}

/** Flatten a patch document into its insert entries (id+name pairs). */
function insertEntries(rows: Array<Record<string, unknown>>): Array<{ id: string; name?: string; disabled?: unknown }> {
  return rows.flatMap((row) => (Array.isArray(row.insert) ? row.insert : [])) as Array<{ id: string; name?: string; disabled?: unknown }>
}

describe('THE ROOT SEAT (the DSH plugin-install recognition shape)', () => {
  it('the root manifest is a recognizable dsh bundle seat', () => {
    expect(MANIFEST.name, 'the root package.json carries the name the git source resolves (ERR_PNPM_MISSING_PACKAGE_NAME without it)').toBe('melite')
    expect(MANIFEST.private, 'the root stays private — the seat rides git, never the npm publish plane').toBe(true)
    expect(typeof MANIFEST.engines?.dsh, 'engines.dsh names the runtime range the compatibility preflight judges').toBe('string')
    expect(MANIFEST.dsh?.bundle?.patch, 'dsh.bundle.patch declares the patch the reconcile seam requires — without it the seat lands as a plain dependency, never a profile layer').toBe('./cordis.patch.yml')
    expect(MANIFEST.dsh?.bundle?.patch && MANIFEST.dsh.bundle.patch.startsWith('./'), 'the patch path is package-relative').toBe(true)
  })

  it('the seat demands no script approval — zero lifecycle scripts on the published plane', () => {
    // pnpm blocks unapproved dependency lifecycle scripts (the
    // ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED class) and the seat's own
    // postinstall was the allowBuilds hint a consumer profile read on every
    // root install. The hook seat lives behind `pnpm run hooks:seat`.
    const lifecycle = ['preinstall', 'install', 'postinstall', 'prepack', 'prepare']
    const present = lifecycle.filter((name) => MANIFEST.scripts?.[name] !== undefined)
    expect(present, `the root manifest carries no lifecycle scripts (found ${present.join(', ')})`).toEqual([])
    expect(MANIFEST.scripts?.['hooks:seat'], 'the hook seat stays reachable as an explicit dev script').toContain('install-lefthook')
  })

  it('the seat dependencies are exactly the consumer-install carriers, from the registry channel', () => {
    const deps = MANIFEST.dependencies ?? {}
    const expected = consumerInstallCarriers()
    expect(Object.keys(deps).filter((n) => n.startsWith('@melite')).sort(), 'the root dependencies name exactly the consumer-install melite carriers').toEqual([...expected].sort())
    for (const [name, spec] of Object.entries(deps)) {
      if (!name.startsWith('@melite')) continue
      expect(spec, `${name}: the seat resolves carriers from the published channel, never the workspace protocol a consumer profile cannot resolve`).not.toContain('workspace:')
      const carrierManifest = JSON.parse(readFileSync(join(ROOT, carrierTable().find(([n]) => n === name)![1], 'package.json'), 'utf8')) as { version?: string }
      expect(spec, `${name}: the seat pin tracks the carrier's own version (the release bump moves both)`).toBe(carrierManifest.version)
    }
  })

  it('the generator carrier table matches consumer-install PROFILE_BASES order', () => {
    expect(carrierTable().map(([name]) => name), 'the derivation reads the carriers in the renderer mount order').toEqual(consumerInstallCarriers())
  })
})

describe('THE SEAT PATCH (the rendered rows the profile composes)', () => {
  it('the committed patch equals the generator derivation — a stale render reds', () => {
    const result = execFileSync('node', ['tools/render-seat-patch.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' })
    expect(result).toContain('render-seat-patch')
  })

  it('every rendered row exists verbatim in some carrier patch, in carrier order', () => {
    const carriers = carrierTable().map(([name, dir]) => {
      const rows = parse(readFileSync(join(ROOT, dir, 'cordis.patch.yml'), 'utf8')) as Array<Record<string, unknown>>
      return { name, entries: insertEntries(rows) }
    })
    const rendered = insertEntries(renderedRows())
    const carrierIds = carriers.flatMap((c) => c.entries.map((e) => e.id))
    expect(rendered.map((e) => e.id), 'the seat rows are the carrier rows concatenated in PROFILE_BASES order — never a rewrite').toEqual(carrierIds)
    for (const entry of rendered) {
      const home = carriers.find((c) => c.entries.some((e) => e.id === entry.id))
      const origin = home?.entries.find((e) => e.id === entry.id)
      expect(origin, `row ${entry.id}: no carrier patch carries it — an invented seat row is a drift`).toBeTruthy()
      expect(entry.name, `row ${entry.id}: the seat names the same package its carrier names`).toBe(origin!.name ?? undefined)
    }
  })

  it('the override rows (non-insert) render verbatim too', () => {
    const carrierOverrides = carrierTable().flatMap(([, dir]) => {
      const rows = parse(readFileSync(join(ROOT, dir, 'cordis.patch.yml'), 'utf8')) as Array<Record<string, unknown>>
      return rows.filter((row) => !Array.isArray(row.insert)).map((row) => row.id)
    })
    const renderedOverrides = renderedRows().filter((row) => !Array.isArray(row.insert)).map((row) => row.id)
    expect(renderedOverrides, 'the seat carries every carrier override row (the skill-filesystem pin rides the seat)').toEqual(carrierOverrides)
  })

  it('exactly the four web-surface rows carry the startedBundles disable', () => {
    const WEB_IDS = ['melite-tools-doors', 'infer-card-view', 'ray-card-deck', 'infer-gallery']
    const EXPR = 'startedBundles'
    const rendered = insertEntries(renderedRows())
    const disabled = rendered.filter((entry) => typeof entry.disabled === 'string' && entry.disabled.includes(EXPR)).map((entry) => entry.id)
    expect(disabled.sort(), 'exactly consumer-install\'s webRows carry the runtime disable').toEqual([...WEB_IDS].sort())
    for (const entry of rendered) {
      if (WEB_IDS.includes(entry.id)) {
        expect(String(entry.disabled), `row ${entry.id}: the disable reads the mount shape at composition time`).toContain('@deepseek-ai/dsh-web-app')
      }
    }
  })
})
