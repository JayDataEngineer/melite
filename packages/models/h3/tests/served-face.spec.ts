/** THE SERVED FACE (operator 2026-11-05: "I don't want a prompt for
 * the Layer A for the full model, remove that") — the film-level
 * prompt field is GONE from the served schema. The calls own the
 * prompts: the single-call lift composes p.prompt from the call's
 * text (h3-timeline card.ts); the merged film composes one prompt
 * from N windows (actions.ts). A textless call refuses at compose —
 * the film field never substituted for one by its own doc.
 *
 * DEPTH (the canon's fourth axis): this wall reads the REAL
 * paramSchema — the served spec's source of truth — never a frozen
 * envelope. The engine-harness UI arm (studio-run-recipe-engine,
 * "NO film-level prompt is served") rides a stubbed fetch; THIS arm
 * is the schema-plane judge that actually fires when the field
 * grows back. */
import { describe, expect, it } from 'vitest'
import { paramSchema } from '../src/schema.ts'

describe('the served face (2026-11-05: no film-level prompt)', () => {
  it('the serialized schema carries NO prompt field — the calls own the prompts', () => {
    // toJSON() is schemastery's serialization — the SAME envelope the
    // estate serves as the card's spec (formSpec.ts: the root ref's
    // dict is the field-name map). This is the real door, not a
    // frozen census.
    const json = paramSchema.toJSON() as unknown as {
      uid: number
      refs: Record<string, { dict?: Record<string, number> }>
    }
    const root = json.refs[String(json.uid)]
    expect(root?.dict, 'the root object serializes its field map').toBeDefined()
    expect(Object.keys(root?.dict ?? {})).not.toContain('prompt')
  })
})

/* ── THE REFAUDIO TOOLTIP SEATS (defect board D-38 + ESTATE-DOC-FIXES
 * §14, 2026-11-18: "the duck prose hardcodes a number the card also
 * exposes as a dial" and the rail "has no stated behaviour") ── the
 * GUI hover is a prose seat the board judged: the ref_audios tooltip
 * must state the rail's behaviour (once per window, mixed UNDER a
 * conditioned row at the dial, not a placed line, audio never rides
 * the mod bag) and the duck_depth_db tooltip must name both duck
 * sources and the dial's range. DEPTH: read from the REAL
 * paramSchema.toJSON() — the same envelope the estate serves. */
describe('the served face carries the refaudio rail truth (D-38/§14)', () => {
  const seatTooltips = (): string[] => {
    const json = paramSchema.toJSON() as unknown as {
      refs: Record<string, { meta?: { extra?: { tooltip?: string } } }>
    }
    return Object.values(json.refs)
      .map((ref) => ref?.meta?.extra?.tooltip)
      .filter((t): t is string => typeof t === 'string')
  }

  it('the ref_audios tooltip states the rail: once per window, UNDER a conditioned row at duck_depth_db, not a placed line, audio never rides ref_mods', () => {
    const tooltips = seatTooltips()
    const rail = tooltips.find((t) => t.includes('Sound references'))
    expect(rail, 'the ref_audios tooltip is served').toBeDefined()
    expect(rail).toMatch(/Conditions each window's generated voice/)
    expect(rail).toMatch(/loaded once per window/)
    expect(rail).toMatch(/mixes UNDER a conditioned row at duck_depth_db/)
    expect(rail).toMatch(/Not a placed line/)
    expect(rail).toMatch(/Audio does not ride ref_mods; the mod bag is the image identity bake/)
  })

  it('the duck_depth_db tooltip names BOTH duck sources (a placed clip or a ref_audios voice) and the dial range', () => {
    const tooltips = seatTooltips()
    const duck = tooltips.find((t) => t.includes('mix-desk default'))
    expect(duck, 'the duck_depth_db tooltip is served').toBeDefined()
    expect(duck).toMatch(/under a conditioned row — a placed dialogue clip or a ref_audios voice/)
    expect(duck).toMatch(/range −48–0/)
  })
})
