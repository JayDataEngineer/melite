/**
 * hmr-composition.spec.ts — THE F8 WALL (HMR audit 009, 2026-10-24):
 * "the consumer recomposition path needs dsh-hmr mounted for
 * patch-file reactivity; bundle-row changes via Plugin Manager work
 * without it, but a consumer's cordis.patch.yml edit is a SILENT
 * NO-OP on a profile whose context did not mount hmr."
 *
 * THE MELITE-SIDE LAW this wall pins: hmr is upstream's row
 * (@deepseek-ai/dsh-base cordis.patch.yml: `id: hmr`, disabled
 * only under `!ctx.get('profileContext')` — enabled in every
 * interactive profile). Melite does not ship that row; what melite
 * OWNS is the composition: every base set the provisioner mints
 * and the tracked e2e seed mounts dsh-base (the hmr carrier), and
 * no melite-authored layer (the provisioner's own patch, the
 * seed's user layer) ever DISABLES the hmr row. Break either half
 * and a consumer's patch save goes silent on every melite profile.
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   A. every provisioner base set includes '@deepseek-ai/dsh-base'.
 *   B. the tracked e2e seed includes it too.
 *   C. no melite-authored composition layer disables the hmr row.
 *   D. (machine-local, self-skips without an install) the installed
 *      dsh-base copy actually carries the enabled-by-default hmr
 *      row with the profileContext guard — the upstream truth the
 *      first three arms carry by proxy.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const PROVISIONER_BIN = join(ROOT, 'packages/harness/provisioner/bin/infer-provision.mjs')
const SEED_PKG = join(ROOT, 'packages/web/melite-card-view/e2e/profile-seed/package.json')
const SEED_CORDIS = join(ROOT, 'packages/web/melite-card-view/e2e/profile-seed/cordis.yml')
const PROVISIONER_PATCH = join(ROOT, 'packages/harness/provisioner/cordis.patch.yml')
const LIVE_BASE = join(process.env.HOME ?? '', '.dsh/profiles/web/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml')

/** The base sets table as authored arrays (name → bundle list). */
function provisionerBases(): Map<string, string[]> {
  const src = readFileSync(PROVISIONER_BIN, 'utf8')
  const out = new Map<string, string[]>()
  // entries look like:  'name': ['@deepseek-ai/dsh-base', ...],
  // or unquoted:        name: ['@deepseek-ai/dsh-base', ...],
  const re = /'??([\w-]+)'??\s*:\s*\[([^\]]*)\]/g
  for (const m of src.matchAll(re)) {
    const bundles = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
    // only real base rows carry @deepseek-ai members (skip stray
    // arrays the regex may catch elsewhere in the script)
    if (bundles.some((b) => b.startsWith('@deepseek-ai/'))) out.set(m[1], bundles)
  }
  return out
}

describe('the F8 hmr-composition law (a consumer patch save is never silent)', () => {
  it('A: every provisioner base set mounts @deepseek-ai/dsh-base (the hmr carrier)', () => {
    const bases = provisionerBases()
    expect(bases.size, 'the provisioner authors base sets').toBeGreaterThan(0)
    for (const [name, bundles] of bases) {
      expect(bundles, `base set "${name}" carries dsh-base`).toContain('@deepseek-ai/dsh-base')
    }
  })

  it('B: the tracked e2e seed mounts dsh-base too', () => {
    const pkg = JSON.parse(readFileSync(SEED_PKG, 'utf8'))
    const bundles: string[] = pkg.dsh?.profile?.bundles ?? []
    expect(bundles, 'the seed carries dsh-base').toContain('@deepseek-ai/dsh-base')
  })

  it('C: no melite-authored layer disables the hmr row', () => {
    // THE SILENT-NO-OP SEAT: a `- id: hmr` override with a truthy
    // disabled in any melite layer would silence every consumer
    // patch save while every tool keeps answering.
    const layers: Array<[string, string]> = [
      ['provisioner patch', readFileSync(PROVISIONER_PATCH, 'utf8')],
      ['seed user layer', readFileSync(SEED_CORDIS, 'utf8')],
    ]
    for (const [name, text] of layers) {
      const hasRow = /^\s*-\s*id:\s*hmr\b/m.test(text)
      expect(hasRow, `${name} never overrides the hmr row (upstream owns it)`).toBe(false)
    }
  })

  it('D: the installed dsh-base carries the enabled hmr row (machine-local)', () => {
    if (!existsSync(LIVE_BASE)) return // no install on this machine — arms A-C carry the law
    const text = readFileSync(LIVE_BASE, 'utf8')
    // split into row blocks at every `- id:` boundary, then find the
    // hmr row block (id + name + guard live together)
    const blocks = text.split(/^(?=\s*-\s*id:)/m)
    const row = blocks.find((b) => /^\s*-\s*id:\s*hmr\s*$/m.test(b) && b.includes("name: '@deepseek-ai/dsh-hmr'"))
    expect(row, 'the installed dsh-base carries the hmr row').toBeTruthy()
    expect(row, 'the guard is the profileContext one (enabled in interactive profiles)').toContain("!!js \"!ctx.get('profileContext')\"")
  })
})
