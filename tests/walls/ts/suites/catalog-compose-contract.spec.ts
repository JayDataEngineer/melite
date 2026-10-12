// THE COMPOSITION→CONTRACT EDGE (the seam with no judge, caught live
// by the GPU tier's first run, 2026-10-12): discovery.ts's
// cardSections/catalogSection COMPOSE the catalog doc the browser
// validates with validateCatalogContract — and nothing judged the two
// together. The minted-model kill (PROOF-12, 3e40a88c8) respelled the
// model-less card rows (rig, mask) as explicit nulls; the wire type
// carries no null arm (default_family?: string) and the browser
// checker red "present but not a string" on every lane boot — a green
// battery all the way down. This wall rides BOTH truths live: the
// real defs through the real assembly through the real checker.
//
// The GPU pilot's zero-error ledger is the browser-side face of this
// contract (e2e/gpu/z-image-human-run.spec.ts); this wall is the
// keyless face — the regression class reds here without a GPU.
import '../../../../tests/helpers/boot-models.ts'
import { describe, it, expect } from 'vitest'
import { loadCardDefs } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-cordis'
import { validateCatalogContract } from '@melite/catalog'
import {
  cardSections,
  catalogSection,
} from '../../../../packages/harness/melite-tools/src/discovery.ts'

/** The minimal catalog scaffold around a capabilities record — the
 * checker's families/models arms stay satisfied so the CAPABILITY
 * verdict is the only thing under judgment. */
const aroundCaps = (capabilities: Record<string, unknown>) => ({
  families: { f: { id: 'f', label: 'F', models: ['m'] } },
  models: { m: { id: 'm', family: 'f', form: 'image', label: 'M' } },
  capabilities,
})

describe('catalog compose→contract edge (the GPU tier catch)', () => {
  it('the LIVE composed catalog passes the browser contract — real defs, real assembly, real checker', async () => {
    const defs = await loadCardDefs()
    const section = catalogSection(defs)
    const { valid, violations } = validateCatalogContract(section)
    expect(
      violations.map((v) => `${v.kind}: ${v.message}`).join('\n'),
      'the catalog the lane serves is the catalog the browser accepts',
    ).toBe('')
    expect(valid).toBe(true)
  })

  it('the JSON wire round-trip stays valid — the door serializes, the browser parses, omission survives', async () => {
    const defs = await loadCardDefs()
    const section = catalogSection(defs)
    // The serve path is JSON: undefined keys DROP (the omission law's
    // transport), and nothing the checker rejects may appear in the
    // parsed body that wasn't in the composed one.
    const overTheWire = JSON.parse(JSON.stringify(section)) as unknown
    const { valid, violations } = validateCatalogContract(overTheWire)
    expect(violations.map((v) => `${v.kind}: ${v.message}`).join('\n')).toBe('')
    expect(valid).toBe(true)
  })

  it('a model-less card (families []) omits the keys — the §11/PROOF-12 spelling the contract admits', () => {
    const def = {
      id: 'y',
      identity: { label: 'Y', description: 'yd', genre: 'image' },
      boarded: [],
    } as unknown as CardDefinition
    const { capabilities } = cardSections(new Map([['y', def]]))
    const row = capabilities['y'] as Record<string, unknown>
    expect('default_family' in row).toBe(false)
    expect('resolved' in row).toBe(false)
    const { valid, violations } = validateCatalogContract(
      aroundCaps({ y: row }),
    )
    expect(violations).toEqual([])
    expect(valid).toBe(true)
  })

  it("the KILL'S OWN CRIME reds: explicit null default_family is present-but-not-a-string", () => {
    // 3e40a88c8's spelling — the exact rows every lane boot served
    // after the minted-model kill. The receipt arm: if the omission
    // cure is ever reverted (in discovery.ts OR the checker's string
    // arm is loosened), this arm states the crime.
    const { valid, violations } = validateCatalogContract(
      aroundCaps({
        y: { label: 'Y', families: [], default_family: null, resolved: null },
      }),
    )
    expect(valid).toBe(false)
    expect(
      violations.some((v) => v.message.includes('present but not a string')),
      `expected a present-but-not-a-string violation, got: ${violations.map((v) => v.message).join('; ')}`,
    ).toBe(true)
  })

  it('the model-less waiver does not over-widen: a ROUTED capability still owes default_family or a resolved route', () => {
    // families ['f'] but neither default_family nor resolved — the
    // waiver is for the model-less row only; a routed row that cannot
    // route is still a contract violation.
    const { valid, violations } = validateCatalogContract(
      aroundCaps({ y: { label: 'Y', families: ['f'] } }),
    )
    expect(valid).toBe(false)
    expect(
      violations.some((v) => v.message.includes('default_family or resolved route')),
      `expected a route violation, got: ${violations.map((v) => v.message).join('; ')}`,
    ).toBe(true)
  })

  it('the MINTED-MODEL LIE still reds: a routed row with EMPTY families points its default at no family', () => {
    // PROOF-12's crime class, stated from the contract side: a row
    // that declares a route (default_family or resolved) while
    // carrying families [] — the route points at a family the row
    // does not hold. The honest model-less row (no route) passes; a
    // ROUTED empty row never does.
    const { valid, violations } = validateCatalogContract(
      aroundCaps({
        y: { label: 'Y', families: [], default_family: 'f', resolved: { family: 'f', model: 'm' } },
      }),
    )
    expect(valid).toBe(false)
    expect(
      violations.some((v) => v.message.includes('routed but empty')),
      `expected a routed-but-empty violation, got: ${violations.map((v) => v.message).join('; ')}`,
    ).toBe(true)
  })
})
