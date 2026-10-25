// @contract infra-smoke-rig-law
// smoke-rig-law.spec.ts — THE SMOKE RIG'S OWN LAW (2026-11-12): the
// smoke died silently for three weeks (committed 57cc90a41,
// 2026-10-21: a syntax error at smoke.mjs:127 — `missing ) after
// argument list`) because it is package-local and nothing gated
// even its ability to PARSE. This wall pins the rig's three
// break classes without booting the estate (the full behavioral
// green stays test:smoke's own run — it needs the live engine):
//
// 1. PARSE — node --check accepts the rig; a syntax break ships
//    no further.
// 2. SEAT NAMES — every name in the settle poll's `want` list is
//    a service name the estate sources actually register
//    (derived: `super(ctx, "name")` over estate-queue +
//    melite-estate src, comments stripped — the namespacing law
//    renamed 'skills' to 'meliteSkills' 2026-09-13 and the rig
//    polled the dead name for three weeks).
// 3. FAMILY-FIRST — the family-fiber mount precedes the estate
//    row's own mount in source order: the census gate settles
//    PENDING fibers at the estate row's boot, so families mounted
//    after it never join the boot census (the card-'anny'-boards-
//    'anny' refusal class).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const rigPath = join(here, 'smoke.mjs')
const rig = readFileSync(rigPath, 'utf8')

/** Service names the estate sources register — comment lines
 * stripped first (skillRegistry.ts names the core twin 'skills'
 * in a comment; counting it would blind arm 2 to exactly the
 * rename that once rotted the rig). */
function derivedSeatNames(): Set<string> {
  const out = new Set<string>()
  const roots = [
    join(here, '../../estate-queue/src'),
    join(here, '../../../web/melite-estate/src'),
  ]
  for (const root of roots) {
    for (const dir of [root, ...readdirSync(root, { recursive: true })
      .filter((p) => statSync(join(root, p.toString())).isDirectory())
      .map((p) => join(root, p.toString()))]) {
      for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
        const src = readFileSync(join(dir, f), 'utf8')
        for (const line of src.split('\n')) {
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
          for (const m of line.matchAll(/super\(ctx,\s*["']([\w-]+)["']\)/g)) {
            out.add(m[1])
          }
        }
      }
    }
  }
  return out
}

// recursive imports kept local to the derivation (node:fs members
// named at use — the wall reads only)
import { readdirSync, statSync } from 'node:fs'

describe('the smoke rig law (the 3-week silent death never again)', () => {
  test('PARSE: node --check accepts the rig', () => {
    // execFileSync throws with the parser's verbatim stderr on a
    // syntax break — the exact class that shipped 2026-10-21
    const out = execFileSync('node', ['--check', rigPath], { encoding: 'utf8' })
    expect(out).toBe('')
  })

  test('SEAT NAMES: the settle poll names registered services', () => {
    const wantMatch = rig.match(/const want = \[([^\]]*)\]/)
    expect(wantMatch, 'the settle poll wants list is findable').not.toBeNull()
    const want = [...wantMatch![1].matchAll(/['"]([\w-]+)['"]/g)].map((m) => m[1])
    expect(want.length).toBeGreaterThanOrEqual(7)
    const seats = derivedSeatNames()
    const missing = want.filter((w) => !seats.has(w))
    expect(missing, 'poll names not registered by any estate source (a renamed seat?)').toEqual([])
  })

  test('FAMILY-FIRST: families mount before the estate row', () => {
    const famAt = rig.indexOf('loadFamilies()')
    const estateAt = rig.indexOf('ctx.plugin(estateRow')
    expect(famAt, 'the rig mounts the family fibers (loadFamilies)').toBeGreaterThan(-1)
    expect(estateAt, 'the rig mounts the estate row').toBeGreaterThan(-1)
    // the census gate settles at the estate row's boot — a family
    // mount after it joins only the LATER re-census, never the
    // boot census, and the boot refuses on the first card boarding
    expect(famAt).toBeLessThan(estateAt)
  })
})
