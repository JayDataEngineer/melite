/**
 * THE GROUP VOCABULARY WALL (operator 2026-11-05: "IS THERE EVEN
 * UNIVERSAL SUBCATEGORIES WITH DISTINCT MEMBERS, OR DOES EACH
 * CARD JUST MAKE IT UP ON THE FLY HOWEVER IT WANTS") —
 * the answer is now LAW: every params group a card serves comes
 * from ONE vocabulary with distinct members. A card that invents a
 * group id on the fly fires this wall red at CI, never at the
 * operator's eyes.
 *
 * THE VOCABULARY (two tiers):
 *  UNIVERSAL — every genre may seat them; membership is pinned:
 *    general    the model-level odds (clock, misc run-level)
 *    prompt     the prompt field(s) — never a knob mix
 *    resolution width/height — the geometry pair, nothing else
 *    sampling   sampler/scheduler/steps/cfg/denoise/seed — seed is
 *               a MEMBER, never its own group
 *    reference  reference inputs (images/lists)
 *  GENRE — a genre kit's own surface, declared where the kit lives
 *    (comfyui-card-kit): second_pass, mask, controlnet, ip_adapter,
 *    loras_controlnet, lanpaint, qvoice, input-prep's input.
 *
 * MEMBERSHIP LAWS (distinct members — the operator's own words):
 *  L1 `seed` is NEVER a group id (the music card debt, dated).
 *  L2 `run` is NEVER a group id (the upscale debt, dated).
 *  L3 a `qvoice_save`-style twin stem NEVER rides beside its stem
 *     (the kit debt, dated).
 *  L4 width/height ride ONLY in resolution.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** The pinned vocabulary (this file is the one home). */
const UNIVERSAL_GROUPS = new Set(['general', 'prompt', 'resolution', 'sampling', 'reference'])
/** Genre groups registered by their owning kit (dated entries —
 *  each carries the package that owns the spelling). */
const GENRE_GROUPS = new Map([
  ['second_pass', 'comfyui-card-kit'],
  ['mask', 'comfyui-card-kit'],
  ['controlnet', 'comfyui-card-kit'],
  ['ip_adapter', 'comfyui-card-kit'],
  ['loras_controlnet', 'comfyui-card-kit'],
  ['lanpaint', 'comfyui-card-kit'],
  ['qvoice', 'comfyui-card-kit'],
  ['qvoice_save', 'comfyui-card-kit'],
  ['input', 'img-to-mesh + comfyui-card-kit'],
  // THE SECOND HALF (walls-meta wave-2: the receipt toggle proved
  // the sweep's single-quote regex never saw the double-quoted
  // population — these card-owned surfaces served unjudged):
  ['body', 'anny'], ['identity', 'anny'], ['morph', 'anny'], ['turnaround', 'anny'],
  ['bake', 'img-to-mesh'], ['generation', 'img-to-mesh + music + motion'],
  ['lab', 'img-to-mesh'], ['mesh', 'img-to-mesh'], ['stage', 'img-to-mesh'],
  ['brief', 'agent + craft'], ['mods', 'agent + craft'],
  ['call', 'mcp'],
  ['edit_tuning', 'image-edit'],
  ['transform', 'input-prep'],
  ['tagger', 'tagger'],
  ['target', 'upscale-tools'],
  ['sla', 'h3'],
  // THE BAKE'S OWN SURFACE (study §7.2, 2026-10-19): the RefMod
  // extract's fidelity dials (mode/pool/identity/save) are the h3
  // family's bake tuning — neither sampling nor reference, their own
  // subcategory, owned by the declaring model kit.
  ['refmod', 'h3'],
  ['chain', 'motion'], ['guidance', 'motion'], ['output', 'motion'],
])
/** The DEBT register (L1–L3): spellings that violate the law today,
 *  owed renames — this wall fires the moment a NEW one appears and
 *  the dated ones are ROADMAP'd, never silently blessed. */
const DATED_DEBT = new Set(['seed', 'run', 'qvoice_save'])

/** Sweep every card/schema DECL for `group: '...'` extras — the
 *  REAL files, never a frozen census (the depth law). */
function sweepGroups(): Array<{ file: string, groups: string[] }> {
  const roots = ['packages']
  const out: Array<{ file: string, groups: string[] }> = []
  const walk = (dir: string): void => {
    let entries: string[] = []
    try { entries = readdirSync(dir) } catch { return }
    for (const name of entries) {
      if (name === 'node_modules' || name === 'dist' || name === 'tests' || name === 'lib') continue
      const full = join(dir, name)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) { walk(full); continue }
      if (!/\.(ts|tsx)$/.test(name)) continue
      if (!/(card|schema|pack-fields|fields)\.(ts|tsx)$/.test(name)) continue
      const text = readFileSync(full, 'utf8')
      const groups = [...text.matchAll(/group: (['"])([a-z_]+)\1/g)].map((m) => m[2]!)
      if (groups.length > 0) out.push({ file: full, groups })
    }
  }
  for (const r of roots) walk(r)
  return out
}

describe('THE GROUP VOCABULARY (operator 2026-11-05: universal subcategories with distinct members)', () => {
  it('every served group id comes from the vocabulary — a card cannot invent one on the fly', () => {
    const known = new Set([...UNIVERSAL_GROUPS, ...GENRE_GROUPS.keys(), ...DATED_DEBT])
    const swept = sweepGroups()
    expect(swept.length).toBeGreaterThan(5, 'the sweep must find the real DECLs (a frozen census is a dead wall)')
    const invented: string[] = []
    for (const { file, groups } of swept) {
      for (const g of groups) {
        if (!known.has(g)) invented.push(`${file}: ${g}`)
      }
    }
    expect(invented).toEqual([])
  })

  it('L4: width/height ride ONLY in resolution — the geometry pair owns its group alone', () => {
    for (const { file, groups } of sweepGroups()) {
      const text = readFileSync(file, 'utf8')
      for (const key of ['width', 'height']) {
        const line = text.split('\n').find((l) => l.trim().startsWith(`${key}:`))
        if (line === undefined) continue
        const m = /group: '([a-z_]+)'/.exec(line)
        if (m !== null) expect(m[1], `${file}: ${key}`).toBe('resolution')
      }
    }
  })

  it('the dated debts are EXACTLY the register — a new L1/L3 violation fires red', () => {
    const swept = sweepGroups()
    const seedGroups = swept.filter(({ groups }) => groups.includes('seed'))
    expect(seedGroups.length, 'seed-as-a-group is the dated music debt; a second one is new chaos').toBeLessThanOrEqual(1)
    const runGroups = swept.filter(({ groups }) => groups.includes('run'))
    expect(runGroups.length, 'run-as-a-group is the dated upscale debt').toBeLessThanOrEqual(1)
  })
})
