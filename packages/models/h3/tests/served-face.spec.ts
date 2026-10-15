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
